import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from './client';
import type {
  ApiEnvelope, Category, Coupon, MenuSection, Order, PaymentIntent,
  Restaurant, Review, User,
} from './types';
import { useAuthStore } from '@/store/authStore';

// ---- Discovery ----

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: async () =>
      (await api.get<ApiEnvelope<Category[]>>('/categories')).data.data,
    staleTime: 30 * 60_000,
  });

export interface RestaurantFilters {
  search?: string;
  category?: string;
  vegOnly?: boolean;
  minRating?: number;
  maxDeliveryTime?: number;
  sort?: 'rating' | 'delivery_time' | 'price_low' | 'price_high' | 'relevance';
  lat?: number;
  lng?: number;
}

export const useRestaurants = (filters: RestaurantFilters) =>
  useInfiniteQuery({
    queryKey: ['restaurants', filters],
    queryFn: async ({ pageParam }) => {
      const res = await api.get<ApiEnvelope<{ items: Restaurant[]; hasMore: boolean; page: number }>>(
        '/restaurants',
        { params: { ...filters, page: pageParam, limit: 20 } },
      );
      return res.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    staleTime: 2 * 60_000,
  });

export const useRestaurant = (id: string) =>
  useQuery({
    queryKey: ['restaurant', id],
    queryFn: async () =>
      (await api.get<ApiEnvelope<Restaurant>>(`/restaurants/${id}`)).data.data,
    staleTime: 5 * 60_000,
  });

export const useMenu = (restaurantId: string) =>
  useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: async () =>
      (await api.get<ApiEnvelope<MenuSection[]>>(`/restaurants/${restaurantId}/menu`)).data.data,
    staleTime: 5 * 60_000,
  });

export const useRestaurantReviews = (restaurantId: string) =>
  useQuery({
    queryKey: ['reviews', restaurantId],
    queryFn: async () =>
      (await api.get<ApiEnvelope<Review[]>>(`/restaurants/${restaurantId}/reviews`)).data.data,
  });

export const useRecommendations = () =>
  useQuery({
    queryKey: ['recommendations'],
    queryFn: async () =>
      (await api.get<ApiEnvelope<Restaurant[]>>('/recommendations')).data.data,
    staleTime: 10 * 60_000,
    enabled: !!useAuthStore.getState().token,
  });

// ---- Coupons ----

export const useCoupons = () =>
  useQuery({
    queryKey: ['coupons'],
    queryFn: async () => (await api.get<ApiEnvelope<Coupon[]>>('/coupons')).data.data,
    staleTime: 10 * 60_000,
  });

// ---- Orders ----

export interface PlaceOrderInput {
  restaurantId: string;
  items: { menuItemId: string; quantity: number; variant?: string; addOns: string[] }[];
  addressId: string;
  couponCode?: string;
  paymentProvider: 'razorpay' | 'stripe' | 'cod';
  specialInstructions?: string;
}

export const usePlaceOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PlaceOrderInput) =>
      (await api.post<ApiEnvelope<{ order: Order; paymentIntent: PaymentIntent | null }>>('/orders', input))
        .data.data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

export const useVerifyRazorpay = () =>
  useMutation({
    mutationFn: async (input: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => (await api.post<ApiEnvelope<{ orderId: string }>>('/payments/razorpay/verify', input)).data.data,
  });

export const useMyOrders = () =>
  useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await api.get<ApiEnvelope<Order[]>>('/orders')).data.data,
  });

export const useOrder = (id: string, opts?: { refetchInterval?: number }) =>
  useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get<ApiEnvelope<Order>>(`/orders/${id}`)).data.data,
    refetchInterval: opts?.refetchInterval,
  });

export const useCancelOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/orders/${id}/cancel`)).data,
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

// ---- Reviews ----

export const useSubmitReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      orderId: string; rating: number; foodRating?: number;
      deliveryRating?: number; comment?: string;
    }) => (await api.post('/reviews', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

// ---- Wishlist / profile ----

export const useWishlist = () =>
  useQuery({
    queryKey: ['wishlist'],
    queryFn: async () =>
      (await api.get<ApiEnvelope<Restaurant[]>>('/users/me/wishlist')).data.data,
  });

export const useToggleWishlist = () => {
  const qc = useQueryClient();
  const { user, setUser } = useAuthStore.getState();
  return useMutation({
    mutationFn: async (restaurantId: string) =>
      (await api.post<ApiEnvelope<{ wishlisted: boolean; wishlist: string[] }>>(
        `/users/me/wishlist/${restaurantId}`,
      )).data.data,
    onSuccess: (data) => {
      if (user) setUser({ ...user, wishlist: data.wishlist });
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
};

export const useUpdateProfile = () =>
  useMutation({
    mutationFn: async (input: Partial<Pick<User, 'name' | 'language' | 'dietaryPreference'>>) =>
      (await api.patch<ApiEnvelope<User>>('/users/me', input)).data.data,
    onSuccess: (user) => useAuthStore.getState().setUser(user),
  });

export const useAddAddress = () =>
  useMutation({
    mutationFn: async (input: {
      label: 'home' | 'work' | 'other'; line1: string; line2?: string;
      city: string; pincode: string; lat: number; lng: number; isDefault?: boolean;
    }) => (await api.post('/users/me/addresses', input)).data,
    onSuccess: async () => {
      const me = (await api.get<ApiEnvelope<User>>('/auth/me')).data.data;
      useAuthStore.getState().setUser(me);
    },
  });
