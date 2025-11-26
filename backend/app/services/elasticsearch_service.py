from elasticsearch import AsyncElasticsearch, NotFoundError
from typing import List, Dict, Any, Optional
import logging

from app.config import settings
from app.models.book import Book

logger = logging.getLogger(__name__)


class ElasticsearchService:
    """Service for Elasticsearch operations"""
    
    def __init__(self):
        self.client: Optional[AsyncElasticsearch] = None
        self.index_name = settings.ELASTICSEARCH_INDEX
        self.enabled = settings.ELASTICSEARCH_ENABLED
        
        if self.enabled:
            try:
                self.client = AsyncElasticsearch([settings.ELASTICSEARCH_URL])
                logger.info(f"Elasticsearch client initialized: {settings.ELASTICSEARCH_URL}")
            except Exception as e:
                logger.error(f"Failed to initialize Elasticsearch: {e}")
                self.enabled = False
    
    async def close(self):
        """Close Elasticsearch connection"""
        if self.client:
            await self.client.close()
    
    async def create_index(self):
        """Create index with mappings"""
        if not self.enabled or not self.client:
            return
        
        mappings = {
            "mappings": {
                "properties": {
                    "id": {"type": "keyword"},
                    "title": {
                        "type": "text",
                        "analyzer": "standard",
                        "fields": {
                            "keyword": {"type": "keyword"},
                            "suggest": {
                                "type": "completion",
                                "analyzer": "simple"
                            }
                        }
                    },
                    "description": {"type": "text"},
                    "isbn": {"type": "keyword"},
                    "publisher": {"type": "text"},
                    "authors": {
                        "type": "text",
                        "fields": {"keyword": {"type": "keyword"}}
                    },
                    "genres": {"type": "keyword"},
                    "keywords": {"type": "keyword"},
                    "publication_year": {"type": "integer"},
                    "average_rating": {"type": "float"},
                    "total_reviews": {"type": "integer"},
                    "created_at": {"type": "date"}
                }
            }
        }
        
        try:
            exists = await self.client.indices.exists(index=self.index_name)
            if not exists:
                await self.client.indices.create(index=self.index_name, body=mappings)
                logger.info(f"Created index: {self.index_name}")
        except Exception as e:
            logger.error(f"Failed to create index: {e}")
    
    async def index_book(self, book: Book) -> bool:
        """Index a single book"""
        if not self.enabled or not self.client:
            return False
        
        try:
            doc = {
                "id": str(book.id),
                "title": book.title,
                "description": book.description,
                "isbn": book.isbn,
                "publisher": book.publisher,
                "authors": [author.name for author in book.authors],
                "genres": [genre.name for genre in book.genres],
                "keywords": [keyword.name for keyword in book.keywords],
                "publication_year": book.publication_year,
                "average_rating": book.average_rating,
                "total_reviews": book.total_reviews,
                "created_at": book.created_at.isoformat() if book.created_at else None
            }
            
            await self.client.index(
                index=self.index_name,
                id=str(book.id),
                document=doc
            )
            logger.debug(f"Indexed book: {book.id}")
            return True
        except Exception as e:
            logger.error(f"Failed to index book {book.id}: {e}")
            return False
    
    async def bulk_index_books(self, books: List[Book]) -> int:
        """Bulk index multiple books"""
        if not self.enabled or not self.client:
            return 0
        
        indexed_count = 0
        for book in books:
            if await self.index_book(book):
                indexed_count += 1
        
        logger.info(f"Bulk indexed {indexed_count}/{len(books)} books")
        return indexed_count
    
    async def update_book(self, book_id: str, data: Dict[str, Any]) -> bool:
        """Update indexed book"""
        if not self.enabled or not self.client:
            return False
        
        try:
            await self.client.update(
                index=self.index_name,
                id=book_id,
                doc=data
            )
            logger.debug(f"Updated book: {book_id}")
            return True
        except NotFoundError:
            logger.warning(f"Book not found in index: {book_id}")
            return False
        except Exception as e:
            logger.error(f"Failed to update book {book_id}: {e}")
            return False
    
    async def delete_book(self, book_id: str) -> bool:
        """Delete book from index"""
        if not self.enabled or not self.client:
            return False
        
        try:
            await self.client.delete(
                index=self.index_name,
                id=book_id
            )
            logger.debug(f"Deleted book: {book_id}")
            return True
        except NotFoundError:
            logger.warning(f"Book not found in index: {book_id}")
            return False
        except Exception as e:
            logger.error(f"Failed to delete book {book_id}: {e}")
            return False
    
    async def search_books(
        self,
        query: str,
        genres: Optional[List[str]] = None,
        authors: Optional[List[str]] = None,
        min_rating: Optional[float] = None,
        max_rating: Optional[float] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Full-text search with filters
        
        Returns:
            Dict with 'hits' (results), 'total' (count), and 'took' (ms)
        """
        if not self.enabled or not self.client:
            return {"hits": [], "total": 0, "took": 0}
        
        try:
            # Build query
            must_clauses = []
            filter_clauses = []
            
            # Text search
            if query:
                must_clauses.append({
                    "multi_match": {
                        "query": query,
                        "fields": ["title^3", "description", "authors^2", "publisher"],
                        "fuzziness": "AUTO"
                    }
                })
            else:
                must_clauses.append({"match_all": {}})
            
            # Filters
            if genres:
                filter_clauses.append({"terms": {"genres": genres}})
            
            if authors:
                filter_clauses.append({"terms": {"authors.keyword": authors}})
            
            if min_rating is not None or max_rating is not None:
                range_query = {}
                if min_rating is not None:
                    range_query["gte"] = min_rating
                if max_rating is not None:
                    range_query["lte"] = max_rating
                filter_clauses.append({"range": {"average_rating": range_query}})
            
            if year_from is not None or year_to is not None:
                range_query = {}
                if year_from is not None:
                    range_query["gte"] = year_from
                if year_to is not None:
                    range_query["lte"] = year_to
                filter_clauses.append({"range": {"publication_year": range_query}})
            
            # Build final query
            search_query = {
                "bool": {
                    "must": must_clauses,
                    "filter": filter_clauses
                }
            }
            
            # Execute search
            from_offset = (page - 1) * page_size
            response = await self.client.search(
                index=self.index_name,
                query=search_query,
                from_=from_offset,
                size=page_size,
                sort=[{"_score": "desc"}, {"created_at": "desc"}]
            )
            
            hits = [hit["_source"] for hit in response["hits"]["hits"]]
            total = response["hits"]["total"]["value"]
            took = response["took"]
            
            return {
                "hits": hits,
                "total": total,
                "took": took
            }
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return {"hits": [], "total": 0, "took": 0}
    
    async def suggest_books(self, prefix: str, size: int = 10) -> List[str]:
        """Autocomplete suggestions"""
        if not self.enabled or not self.client:
            return []
        
        try:
            response = await self.client.search(
                index=self.index_name,
                suggest={
                    "book-suggest": {
                        "prefix": prefix,
                        "completion": {
                            "field": "title.suggest",
                            "size": size,
                            "skip_duplicates": True
                        }
                    }
                }
            )
            
            suggestions = []
            for option in response["suggest"]["book-suggest"][0]["options"]:
                suggestions.append(option["text"])
            
            return suggestions
        except Exception as e:
            logger.error(f"Suggest failed: {e}")
            return []


# Global instance
es_service = ElasticsearchService()
