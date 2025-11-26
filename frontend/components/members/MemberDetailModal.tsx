import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { usersApi, UpdateUserData, RoleUpdateData } from '../../api/users';

interface MemberDetailModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({ userId, isOpen, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [roleChangeModal, setRoleChangeModal] = useState<{ isOpen: boolean; newRole: 'user' | 'librarian' | 'admin' | null }>({ isOpen: false, newRole: null });
  const queryClient = useQueryClient();

  // Fetch user detail
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.getUserDetail(userId),
    enabled: isOpen && !!userId,
  });

  // Fetch borrow history
  const { data: borrowHistory } = useQuery({
    queryKey: ['user-borrow-history', userId],
    queryFn: () => usersApi.getUserBorrowHistory(userId, { page: 1, page_size: 10 }),
    enabled: isOpen && !!userId && activeTab === 'history',
  });

  const [formData, setFormData] = useState<UpdateUserData>({});

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserData) => usersApi.updateUser(userId, data),
    onSuccess: () => {
      toast.success('Đã cập nhật thông tin thành viên');
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error('Lỗi: ' + (error.response?.data?.detail || error.message));
    }
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: (data: RoleUpdateData) => usersApi.updateUserRole(userId, data),
    onSuccess: () => {
      toast.success('Đã cập nhật vai trò');
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (error: any) => {
      toast.error('Lỗi: ' + (error.response?.data?.detail || error.message));
    }
  });

  const handleEdit = () => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email,
        phone_number: user.phone_number || '',
        address: user.address || '',
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleRoleChange = (newRole: 'user' | 'librarian' | 'admin') => {
    setRoleChangeModal({ isOpen: true, newRole });
  };

  const confirmRoleChange = () => {
    if (roleChangeModal.newRole) {
      updateRoleMutation.mutate({ role: roleChangeModal.newRole });
      setRoleChangeModal({ isOpen: false, newRole: null });
    }
  };

  const cancelRoleChange = () => {
    setRoleChangeModal({ isOpen: false, newRole: null });
  };

  const getRoleLabel = (role: 'user' | 'librarian' | 'admin') => {
    const labels = {
      admin: 'Quản trị viên',
      librarian: 'Thủ thư',
      user: 'Thành viên'
    };
    return labels[role];
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chi tiết Thành viên</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            className={`py-3 px-4 font-medium transition-colors ${activeTab === 'info' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('info')}
          >
            Thông tin
          </button>
          <button
            className={`py-3 px-4 font-medium transition-colors ${activeTab === 'history' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('history')}
          >
            Lịch sử mượn sách
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : !user ? (
            <div className="text-center py-12 text-gray-500">Không tìm thấy thông tin thành viên</div>
          ) : (
            <>
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* Statistics Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                        <span className="material-symbols-outlined text-xl">menu_book</span>
                        <span className="text-sm font-medium">Tổng số lượt mượn</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{user.total_borrows}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                        <span className="material-symbols-outlined text-xl">book</span>
                        <span className="text-sm font-medium">Đang mượn</span>
                      </div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">{user.active_borrows}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                        <span className="material-symbols-outlined text-xl">bookmark</span>
                        <span className="text-sm font-medium">Đã đặt trước</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{user.total_reservations}</div>
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vai trò</label>
                    <div className="flex gap-2">
                      {(['user', 'librarian', 'admin'] as const).map((role) => (
                        <button
                          key={role}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${user.role === role ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                          onClick={() => user.role !== role && handleRoleChange(role)}
                          disabled={updateRoleMutation.isPending}
                        >
                          {role === 'admin' ? 'Quản trị viên' : role === 'librarian' ? 'Thủ thư' : 'Thành viên'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* User Information */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                        <input
                          type="text"
                          value={user.username}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Họ tên</label>
                        <input
                          type="text"
                          name="full_name"
                          value={isEditing ? formData.full_name : user.full_name || ''}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${isEditing ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={isEditing ? formData.email : user.email}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${isEditing ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số điện thoại</label>
                      <input
                        type="tel"
                        name="phone_number"
                        value={isEditing ? formData.phone_number : user.phone_number || ''}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${isEditing ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Địa chỉ</label>
                      <textarea
                        name="address"
                        rows={3}
                        value={isEditing ? formData.address : user.address || ''}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg ${isEditing ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày tham gia</label>
                        <input
                          type="text"
                          value={format(new Date(user.created_at), 'dd/MM/yyyy HH:mm')}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trạng thái</label>
                        <div className="flex items-center h-10">
                          {user.is_active ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              Vô hiệu
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4">
                  {borrowHistory?.items.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">Chưa có lịch sử mượn sách</div>
                  ) : (
                    <div className="space-y-3">
                      {borrowHistory?.items.map((record) => (
                        <div key={record.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-primary">menu_book</span>
                                <span className="font-medium text-gray-900 dark:text-white">Copy ID: {record.book_copy_id}</span>
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                <div>Ngày mượn: {format(new Date(record.borrowed_at), 'dd/MM/yyyy')}</div>
                                <div>Hạn trả: {format(new Date(record.due_date), 'dd/MM/yyyy')}</div>
                                {record.returned_at && (
                                  <div>Đã trả: {format(new Date(record.returned_at), 'dd/MM/yyyy')}</div>
                                )}
                              </div>
                            </div>
                            <div>
                              {record.status === 'ACTIVE' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                  Đang mượn
                                </span>
                              )}
                              {record.status === 'RETURNED' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                  Đã trả
                                </span>
                              )}
                              {record.status === 'OVERDUE' && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                  Quá hạn
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'info' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </>
            ) : (
              <button
                onClick={handleEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                Chỉnh sửa
              </button>
            )}
          </div>
        )}
      </div>

      {/* Role Change Confirmation Modal */}
      {roleChangeModal.isOpen && roleChangeModal.newRole && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">swap_horiz</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Xác nhận thay đổi vai trò
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Bạn có chắc chắn muốn thay đổi vai trò của <span className="font-medium text-gray-900 dark:text-white">{user?.full_name || user?.username}</span> thành:
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300 text-center">
                    {getRoleLabel(roleChangeModal.newRole)}
                  </p>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-start gap-1">
                  <span className="material-symbols-outlined text-sm mt-0.5">info</span>
                  <span>Thay đổi vai trò sẽ ảnh hưởng đến quyền hạn truy cập của thành viên này.</span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={cancelRoleChange}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmRoleChange}
                disabled={updateRoleMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updateRoleMutation.isPending && (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                )}
                {updateRoleMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
