import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LibrarianSidebar } from './LibrarianSidebar';
import { dashboardApi } from '../api/dashboard';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#ef4444'];

export const DashboardAnalytics: React.FC = () => {
  const navigate = useNavigate();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
  });

  // Fetch borrow trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => dashboardApi.getBorrowTrends(30),
  });

  // Fetch popular books
  const { data: popularBooks, isLoading: booksLoading } = useQuery({
    queryKey: ['dashboard', 'popular-books'],
    queryFn: () => dashboardApi.getPopularBooks(5),
  });

  // Fetch popular genres
  const { data: popularGenres, isLoading: genresLoading } = useQuery({
    queryKey: ['dashboard', 'popular-genres'],
    queryFn: () => dashboardApi.getPopularGenres(8),
  });

  // Fetch active users
  const { data: activeUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['dashboard', 'active-users'],
    queryFn: () => dashboardApi.getActiveUsers(5),
  });

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return 'https://via.placeholder.com/100x150?text=No+Cover';
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden text-[#343A40] dark:text-gray-200">
      <div className="flex min-h-screen">
        <LibrarianSidebar activePage="DASHBOARD" />

        <main className="flex-1 p-4 md:p-8 w-full overflow-auto">
          <div className="w-full max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">Tổng quan</h1>
              <p className="text-slate-600 dark:text-slate-400">Dashboard phân tích và thống kê thư viện</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Books */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">book</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Sách</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">
                  {statsLoading ? '...' : stats?.library_stats.total_books || 0}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Tổng đầu sách</p>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {statsLoading ? '...' : stats?.library_stats.total_copies || 0} bản sao
                </div>
              </div>

              {/* Total Users */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-2xl">people</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Thành viên</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">
                  {statsLoading ? '...' : stats?.user_stats.total_users || 0}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Tổng người dùng</p>
                <div className="mt-3 text-xs text-green-600 dark:text-green-400">
                  +{statsLoading ? '...' : stats?.user_stats.new_users_this_month || 0} tháng này
                </div>
              </div>

              {/* Active Borrows */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400 text-2xl">library_books</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Đang mượn</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">
                  {statsLoading ? '...' : stats?.borrow_stats.active_borrows || 0}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Sách đang mượn</p>
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {statsLoading ? '...' : stats?.borrow_stats.pending_pickups || 0} chờ lấy sách
                </div>
              </div>

              {/* Overdue */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Quá hạn</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-1">
                  {statsLoading ? '...' : stats?.borrow_stats.overdue_count || 0}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Sách quá hạn</p>
                <div className="mt-3 text-xs text-red-600 dark:text-red-400">
                  Cần xử lý ngay
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Borrow Trends Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Xu hướng mượn sách (30 ngày)</h3>
                {trendsLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).getDate().toString()}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#6366f1"
                        strokeWidth={2}
                        name="Số lượt mượn"
                        dot={{ fill: '#6366f1', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Popular Genres Pie Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Thể loại phổ biến</h3>
                {genresLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={popularGenres}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="borrow_count"
                      >
                        {popularGenres?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Popular Books & Active Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Popular Books */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Top sách được mượn nhiều nhất</h3>
                {booksLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {popularBooks?.map((book, index) => (
                      <div key={book.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => navigate(`/librarian/books`)}>
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{index + 1}</span>
                        </div>
                        <img
                          src={getImageUrl(book.cover_url)}
                          alt={book.title}
                          className="w-12 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-50 truncate">{book.title}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{book.borrow_count} lượt mượn</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Users */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4">Người dùng tích cực nhất</h3>
                {usersLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeUsers?.map((user, index) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => navigate(`/librarian/members`)}>
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{index + 1}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {user.full_name?.charAt(0) || user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-50 truncate">
                            {user.full_name || user.username}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">{user.borrow_count}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">sách</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-4xl">auto_stories</span>
                  <span className="text-xs font-medium uppercase opacity-90">Khả dụng</span>
                </div>
                <p className="text-3xl font-bold mb-1">
                  {statsLoading ? '...' : stats?.library_stats.available_copies || 0}
                </p>
                <p className="text-sm opacity-90">Sách có thể mượn</p>
                <div className="mt-4 text-xs opacity-75">
                  {statsLoading ? '...' : ((stats?.library_stats.available_copies || 0) / (stats?.library_stats.total_copies || 1) * 100).toFixed(1)}% tổng số sách
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-4xl">star</span>
                  <span className="text-xs font-medium uppercase opacity-90">Đánh giá</span>
                </div>
                <p className="text-3xl font-bold mb-1">
                  {statsLoading ? '...' : stats?.review_stats.average_rating.toFixed(1) || 0}
                </p>
                <p className="text-sm opacity-90">Điểm trung bình</p>
                <div className="mt-4 text-xs opacity-75">
                  {statsLoading ? '...' : stats?.review_stats.total_reviews || 0} đánh giá
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                  <span className="text-xs font-medium uppercase opacity-90">Tháng này</span>
                </div>
                <p className="text-3xl font-bold mb-1">
                  {statsLoading ? '...' : stats?.borrow_stats.returned_this_month || 0}
                </p>
                <p className="text-sm opacity-90">Sách đã trả</p>
                <div className="mt-4 text-xs opacity-75">
                  Trong tháng {new Date().getMonth() + 1}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
