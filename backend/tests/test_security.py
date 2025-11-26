"""
Tests for security utilities (password hashing and JWT tokens)
"""
import pytest
from datetime import timedelta, datetime
from jose import JWTError

from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from tests.test_helpers import create_expired_token, create_invalid_token, create_wrong_signature_token


class TestPasswordHashing:
    """Test password hashing functionality"""
    
    def test_hash_password(self):
        """Test that password is hashed correctly"""
        password = "mysecretpassword"
        hashed = hash_password(password)
        
        # Hash should not equal plain password
        assert hashed != password
        # Hash should be a string
        assert isinstance(hashed, str)
        # Hash should have reasonable length (bcrypt hashes are ~60 chars)
        assert len(hashed) > 50
    
    def test_verify_password_correct(self):
        """Test that correct password is verified"""
        password = "mysecretpassword"
        hashed = hash_password(password)
        
        # Correct password should verify
        assert verify_password(password, hashed) is True
    
    def test_verify_password_incorrect(self):
        """Test that incorrect password is rejected"""
        password = "mysecretpassword"
        wrong_password = "wrongpassword"
        hashed = hash_password(password)
        
        # Wrong password should not verify
        assert verify_password(wrong_password, hashed) is False
    
    def test_hashed_passwords_are_different(self):
        """Test that same password produces different hashes (salt)"""
        password = "mysecretpassword"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        # Hashes should be different due to salt
        assert hash1 != hash2
        # But both should verify the same password
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestJWTTokens:
    """Test JWT token creation and validation"""
    
    def test_create_access_token(self):
        """Test access token creation with correct payload"""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        role = "user"
        
        token = create_access_token(data={"sub": user_id, "role": role})
        
        # Token should be a string
        assert isinstance(token, str)
        # Token should have 3 parts (header.payload.signature)
        assert len(token.split('.')) == 3
        
        # Decode and verify payload
        payload = decode_token(token)
        assert payload["sub"] == user_id
        assert payload["role"] == role
        assert payload["type"] == "access"
        assert "exp" in payload
        assert "iat" in payload
    
    def test_create_refresh_token(self):
        """Test refresh token creation"""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        
        token = create_refresh_token(data={"sub": user_id})
        
        # Token should be a string
        assert isinstance(token, str)
        
        # Decode and verify payload
        payload = decode_token(token)
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"
        assert "exp" in payload
        assert "iat" in payload
    
    def test_create_token_with_custom_expiration(self):
        """Test token creation with custom expiration time"""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        custom_expiry = timedelta(minutes=30)
        
        token = create_access_token(
            data={"sub": user_id},
            expires_delta=custom_expiry
        )
        
        payload = decode_token(token)
        exp_time = datetime.fromtimestamp(payload["exp"])
        iat_time = datetime.fromtimestamp(payload["iat"])
        
        # Expiration should be approximately 30 minutes from issued time
        time_diff = (exp_time - iat_time).total_seconds()
        assert 1790 < time_diff < 1810  # Allow small variance
    
    def test_decode_valid_token(self):
        """Test decoding a valid token"""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        role = "admin"
        
        token = create_access_token(data={"sub": user_id, "role": role})
        payload = decode_token(token)
        
        assert payload["sub"] == user_id
        assert payload["role"] == role
        assert payload["type"] == "access"
    
    def test_decode_expired_token(self):
        """Test that expired tokens are rejected"""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        expired_token = create_expired_token(user_id)
        
        # Should raise JWTError for expired token
        with pytest.raises(JWTError):
            decode_token(expired_token)
    
    def test_decode_invalid_token(self):
        """Test that malformed tokens are rejected"""
        invalid_token = create_invalid_token()
        
        # Should raise JWTError for invalid token
        with pytest.raises(JWTError):
            decode_token(invalid_token)
    
    def test_decode_wrong_signature_token(self):
        """Test that tokens with wrong signature are rejected"""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        wrong_sig_token = create_wrong_signature_token(user_id)
        
        # Should raise JWTError for wrong signature
        with pytest.raises(JWTError):
            decode_token(wrong_sig_token)
    
    def test_token_type_validation(self):
        """Test that access and refresh tokens have correct type"""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        
        access_token = create_access_token(data={"sub": user_id})
        refresh_token = create_refresh_token(data={"sub": user_id})
        
        access_payload = decode_token(access_token)
        refresh_payload = decode_token(refresh_token)
        
        assert access_payload["type"] == "access"
        assert refresh_payload["type"] == "refresh"
    
    def test_token_contains_timestamps(self):
        """Test that tokens contain iat and exp timestamps"""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        
        token = create_access_token(data={"sub": user_id})
        payload = decode_token(token)
        
        # Should have issued at and expiration timestamps
        assert "iat" in payload
        assert "exp" in payload
        
        # Expiration should be after issued time
        assert payload["exp"] > payload["iat"]
