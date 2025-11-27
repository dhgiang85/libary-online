import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Modal } from '../common/Modal';
import { authApi } from '../../api/auth';

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  username: z.string().min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự'),
  password: z.string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ HOA')
    .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số'),
  full_name: z.string().optional(),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Mật khẩu không khớp",
  path: ["confirm_password"],
});

type RegisterForm = z.infer<typeof registerSchema>;

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSwitchToLogin }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: RegisterForm) => authApi.register({
      email: data.email,
      username: data.username,
      password: data.password,
      full_name: data.full_name
    }),
    onSuccess: () => {
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      reset();
      onClose();
      onSwitchToLogin();
    },
    onError: (error: any) => {
      // Extract detailed error message from backend response
      let errorMessage = 'Đăng ký thất bại';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Handle validation errors (array format)
        if (Array.isArray(detail)) {
          errorMessage = detail.map((err: any) => {
            const field = err.loc?.[1] || 'field';
            return `${field}: ${err.msg}`;
          }).join(', ');
        } 
        // Handle string error messages
        else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: RegisterForm) => {
    mutation.mutate(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đăng ký tài khoản">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="example@email.com"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tên đăng nhập
          </label>
          <input
            {...register('username')}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="username"
          />
          {errors.username && (
            <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Họ và tên (Tùy chọn)
          </label>
          <input
            {...register('full_name')}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Nguyễn Văn A"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mật khẩu
          </label>
          <input
            {...register('password')}
            type="password"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Ít nhất 8 ký tự (A-z, 0-9)"
          />
          {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ HOA, chữ thường và số
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Xác nhận mật khẩu
          </label>
          <input
            {...register('confirm_password')}
            type="password"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Nhập lại mật khẩu"
          />
          {errors.confirm_password && (
            <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? 'Đang xử lý...' : 'Đăng ký'}
        </button>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Đã có tài khoản?{' '}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSwitchToLogin();
            }}
            className="text-primary hover:underline font-medium"
          >
            Đăng nhập ngay
          </button>
        </div>
      </form>
    </Modal>
  );
};
