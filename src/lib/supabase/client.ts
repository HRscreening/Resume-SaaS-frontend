import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!_client) {
    _client = createSupabaseClient(supabaseUrl, supabaseAnonKey
    );
  }
  return _client;
}

// export function createClient() {
//   if (!_client) {
//     _client = createSupabaseClient(supabaseUrl, supabaseAnonKey,
//       {
//         auth: {
//           storage: {
//             getItem: (key) => {
//               // Implementation to read from cookies
//             },
//             setItem: (key, value) => {
//               // Implementation to set cookie on domain: '.hiresort.ai'
//             },
//             removeItem: (key) => {
//               // Implementation to remove cookie
//             },
//           },
//           flowType: 'pkce',
//         }
//       }
//     );
//   }
//   return _client;
// }
