function createAuthProvider(options = {}) {
  const providerName = String(options.providerName || 'local_code').trim().toLowerCase();
  const supabaseUrl = String(options.supabaseUrl || '').trim();
  const supabaseAnonKey = String(options.supabaseAnonKey || '').trim();

  function getPublicStatus() {
    if (providerName === 'local_code') {
      return {
        provider: 'local_code',
        ready: true,
        capabilities: ['otp_code']
      };
    }

    if (providerName === 'supabase') {
      const ready = Boolean(supabaseUrl && supabaseAnonKey);
      return {
        provider: 'supabase',
        ready,
        capabilities: ['magic_link'],
        missing: ready ? [] : ['SUPABASE_URL', 'SUPABASE_ANON_KEY']
      };
    }

    return {
      provider: providerName,
      ready: false,
      capabilities: [],
      error: 'Unsupported AUTH_PROVIDER value'
    };
  }

  async function requestMagicLink() {
    if (providerName === 'supabase') {
      const status = getPublicStatus();
      if (!status.ready) {
        return {
          ok: false,
          statusCode: 400,
          error: 'Supabase provider is not configured'
        };
      }

      return {
        ok: false,
        statusCode: 501,
        error: 'Supabase magic-link adapter is not wired yet',
        code: 'provider_not_implemented'
      };
    }

    return {
      ok: false,
      statusCode: 400,
      error: 'Magic-link flow is available only when AUTH_PROVIDER=supabase',
      code: 'provider_not_supported'
    };
  }

  return {
    providerName,
    getPublicStatus,
    requestMagicLink
  };
}

module.exports = {
  createAuthProvider
};
