import { QueryClient } from '@tanstack/react-query';


const shouldRetryQuery = (failureCount, error) => {
	if (failureCount >= 2) return false;
	const msg = String(error?.message || '').toLowerCase();
	return (
		error?.name === 'TypeError' ||
		msg.includes('network') ||
		msg.includes('fetch') ||
		msg.includes('failed to fetch') ||
		msg.includes('load failed')
	);
};

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: shouldRetryQuery,
			throwOnError: false,
			staleTime: 5 * 60 * 1000,
			gcTime: 24 * 60 * 60 * 1000,
			refetchOnMount: false,
			refetchOnReconnect: 'always',
			networkMode: 'offlineFirst',
		},
		mutations: {
			retry: 0,
			throwOnError: false,
			networkMode: 'offlineFirst',
		},
	},
});