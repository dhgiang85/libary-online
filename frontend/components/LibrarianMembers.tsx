import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { LibrarianSidebar } from './LibrarianSidebar';
import { usersApi } from '../api/users';
import { MemberDetailModal } from './members/MemberDetailModal';

type RoleFilter = 'all' | 'user' | 'librarian' | 'admin';
type StatusFilter = 'all' | 'active' | 'inactive';

export const LibrarianMembers: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [memberToDeactivate, setMemberToDeactivate] = useState<{ id: string; username: string; fullName: string } | null>(null);
  const queryClient = useQueryClient();

  // Fetch members
  const { data: membersData, isLoading } = useQuery({
    queryKey: ['members', page, search, roleFilter, statusFilter],
    queryFn: () => usersApi.getUsers({
      page,
      page_size: 20,
      role: roleFilter !== 'all' ? roleFilter : undefined,
      is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
      search: search || undefined
    }),
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivateUser,
    onSuccess: () => {
      toast.success('Đã vô hiệu hóa thành viên');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setDeactivateModalOpen(false);
      setMemberToDeactivate(null);
    },
    onError: (error: any) => {
      toast.error('Lỗi: ' + (error.response?.data?.detail || error.message));
    }
  });

  const handleViewDetail = (userId: string) => {
    setSelectedUserId(userId);
    setIsDetailModalOpen(true);
  };

  const handleDeactivateClick = (userId: string, username: string, fullName: string) => {
    setMemberToDeactivate({ id: userId, username, fullName });
    setDeactivateModalOpen(true);
  };

  const handleDeactivateConfirm = () => {
    if (memberToDeactivate) {
      deactivateMutation.mutate(memberToDeactivate.id);
    }
  };

  const handleDeactivateCancel = () => {
    setDeactivateModalOpen(false);
    setMemberToDeactivate(null);
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      librarian: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      user: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    };
    const labels = {
      admin: 'Quản trị viên',
      librarian: 'Thủ thư',
      user: 'Thành viên'
    };
    return {
      className: badges[role as keyof typeof badges] || badges.user,
      label: labels[role as keyof typeof labels] || 'Thành viên'
    };
  };

  const getRoleLabel = (role: RoleFilter) => {
    const labels = {
      all: 'Tất cả',
      user: 'Thành viên',
      librarian: 'Thủ thư',
      admin: 'Quản trị viên'
    };
    return labels[role];
  };

  const getStatusLabel = (status: StatusFilter) => {
    const labels = {
      all: 'Tất cả',
      active: 'Hoạt động',
      inactive: 'Vô hiệu'
    };
    return labels[status];
  };

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden text-[#343A40] dark:text-gray-200">
      <div className="flex min-h-screen">
        <LibrarianSidebar activePage="MEMBERS" />

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 w-full overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Page Heading */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex flex-col">
                <h1 className="text-[#0d141b] dark:text-white text-3xl font-black leading-tight tracking-tight">Quản lý Thành viên</h1>
                <p className="text-[#4c739a] dark:text-gray-400 text-base font-normal leading-normal mt-1">Quản lý thông tin và quyền hạn của thành viên thư viện.</p>
              </div>
            </div>

            {/* Toolbar: Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* SearchBar */}
              <div className="flex-grow">
                <label className="flex flex-col w-full">
                  <div className="flex w-full flex-1 items-stretch rounded-lg h-11 bg-white dark:bg-background-dark border border-slate-200 dark:border-gray-700 shadow-sm">
                    <div className="text-[#4c739a] dark:text-gray-400 flex items-center justify-center pl-4">
                      <span className="material-symbols-outlined">search</span>
                    </div>
                    <input
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] dark:text-gray-200 focus:outline-0 focus:ring-0 border-none bg-white dark:bg-background-dark h-full placeholder:text-[#4c739a] dark:placeholder:text-gray-500 px-2 text-sm font-normal leading-normal"
                      placeholder="Tìm kiếm theo tên, email, username..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </label>
              </div>
              {/* Filter Dropdowns */}
              <div className="flex gap-2 flex-wrap">
                {/* Role Filter */}
                <div className="relative">
                  <button
                    className="flex h-11 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-background-dark border border-slate-200 dark:border-gray-700 pl-3 pr-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  >
                    <p className="text-[#0d141b] dark:text-gray-300 text-sm font-medium leading-normal">Vai trò: {getRoleLabel(roleFilter)}</p>
                    <span className="material-symbols-outlined text-[#4c739a] dark:text-gray-400" style={{fontSize: '20px'}}>arrow_drop_down</span>
                  </button>
                  {roleDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setRoleDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                        <div className="py-1">
                          {(['all', 'user', 'librarian', 'admin'] as RoleFilter[]).map((role) => (
                            <button
                              key={role}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 text-[#0d141b] dark:text-gray-300"
                              onClick={() => { setRoleFilter(role); setRoleDropdownOpen(false); }}
                            >
                              {getRoleLabel(role)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <button
                    className="flex h-11 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-background-dark border border-slate-200 dark:border-gray-700 pl-3 pr-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  >
                    <p className="text-[#0d141b] dark:text-gray-300 text-sm font-medium leading-normal">Trạng thái: {getStatusLabel(statusFilter)}</p>
                    <span className="material-symbols-outlined text-[#4c739a] dark:text-gray-400" style={{fontSize: '20px'}}>arrow_drop_down</span>
                  </button>
                  {statusDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                        <div className="py-1">
                          {(['all', 'active', 'inactive'] as StatusFilter[]).map((status) => (
                            <button
                              key={status}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 text-[#0d141b] dark:text-gray-300"
                              onClick={() => { setStatusFilter(status); setStatusDropdownOpen(false); }}
                            >
                              {getStatusLabel(status)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Members Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-200 dark:border-gray-700 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : membersData?.items.length === 0 ? (
                <div className="text-center py-12 text-slate-500">Không tìm thấy thành viên nào.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thành viên</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vai trò</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trạng thái</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ngày tham gia</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-gray-700">
                      {membersData?.items.map((member) => {
                        const roleBadge = getRoleBadge(member.role);
                        return (
                          <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-primary">person</span>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-[#0d141b] dark:text-white">{member.full_name || member.username}</div>
                                  <div className="text-sm text-slate-500 dark:text-slate-400">@{member.username}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-[#0d141b] dark:text-gray-300">{member.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge.className}`}>
                                {roleBadge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {member.is_active ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                  Hoạt động
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                  Vô hiệu
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                              {format(new Date(member.created_at), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  className="text-primary hover:text-primary/80 transition-colors"
                                  onClick={() => handleViewDetail(member.id)}
                                  title="Xem chi tiết"
                                >
                                  <span className="material-symbols-outlined text-xl">visibility</span>
                                </button>
                                {member.is_active && (
                                  <button
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                    onClick={() => handleDeactivateClick(member.id, member.username, member.full_name || member.username)}
                                    title="Vô hiệu hóa"
                                  >
                                    <span className="material-symbols-outlined text-xl">block</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {membersData && membersData.total_pages > 1 && (
              <div className="flex items-center justify-center mt-8">
                <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 cursor-pointer disabled:opacity-50"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <span className="material-symbols-outlined" style={{fontSize: '20px'}}>chevron_left</span>
                  </button>

                  {Array.from({ length: Math.min(5, membersData.total_pages) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 cursor-pointer ${page === p ? 'bg-primary text-white focus-visible:outline-primary' : 'text-gray-900 dark:text-gray-300'}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 cursor-pointer disabled:opacity-50"
                    disabled={page === membersData.total_pages}
                    onClick={() => setPage(p => Math.min(membersData.total_pages, p + 1))}
                  >
                    <span className="material-symbols-outlined" style={{fontSize: '20px'}}>chevron_right</span>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Deactivate Confirmation Modal */}
      {deactivateModalOpen && memberToDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Xác nhận vô hiệu hóa thành viên
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Bạn có chắc chắn muốn vô hiệu hóa thành viên này?
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded p-2 mt-2">
                  {memberToDeactivate.fullName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  (@{memberToDeactivate.username})
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Thành viên sẽ không thể đăng nhập sau khi bị vô hiệu hóa!
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleDeactivateCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeactivateConfirm}
                disabled={deactivateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deactivateMutation.isPending && (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                )}
                {deactivateMutation.isPending ? 'Đang xử lý...' : 'Vô hiệu hóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Detail Modal */}
      {isDetailModalOpen && selectedUserId && (
        <MemberDetailModal
          userId={selectedUserId}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedUserId(null);
          }}
        />
      )}
    </div>
  );
};
