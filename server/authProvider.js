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

  async function requestMagicLink(email) {
    if (providerName === 'supabase') {
      const status = getPublicStatus();
      if (!status.ready) {
        return {
          ok: false,
          statusCode: 400,
          error: 'Supabase provider is not configured'
        };
      }

      const trimmed = String(email || '').trim().toLowerCase();
      if (!trimmed || !/^[^@]+@[^@]+\.[a-z]{2,}$/.test(trimmed)) {
        return {
          ok: false,
          statusCode: 400,
          error: 'Invalid email format',
          code: 'bad_email'
        };
      }

      try {

        const response = await fetch(`${supabaseUrl}/auth/v1/otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({
            email: trimmed,
            data: {},
            gotrue_meta_security: { hcaptcha_token: null }
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Supabase OTP send failed: ${response.status} ${errorBody}`);
          return {
            ok: false,
            statusCode: response.status >= 500 ? 500 : 400,
            error: 'Failed to send magic link',
            code: 'provider_error'
          };
        }

        return {
          ok: true,
          statusCode: 200,
          message: 'Magic link sent to email',
          email: trimmed
        };
      } catch (err) {
        console.error(`Supabase magic-link request error: ${err.message}`);
        return {
          ok: false,
          statusCode: 500,
          error: 'Internal provider error',
          code: 'request_failed'
        };
      }
    }

    return {
      ok: false,
      statusCode: 400,
      error: 'Magic-link flow is available only when AUTH_PROVIDER=supabase',
      code: 'provider_not_supported'
    };
  }

  async function verifyMagicLinkToken(token) {
    if (providerName === 'supabase') {
      const status = getPublicStatus();
      if (!status.ready) {
        return {
          ok: false,
          statusCode: 400,
          error: 'Supabase provider is not configured'
        };
      }

      const trimmed = String(token || '').trim();
      if (!trimmed) {
        return {
          ok: false,
          statusCode: 400,
          error: 'Token is required',
          code: 'bad_token'
        };
      }

      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey
          },
          body: JSON.stringify({
            token_hash: trimmed,
            type: 'magiclink'
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Supabase verify failed: ${response.status} ${errorBody}`);
          return {
            ok: false,
            statusCode: response.status >= 500 ? 500 : 400,
            error: 'Token verification failed',
            code: 'verify_failed'
          };
        }

        const data = await response.json();
        if (!data.user || !data.user.email) {
          return {
            ok: false,
            statusCode: 400,
            error: 'Invalid token response',
            code: 'bad_response'
          };
        }

        return {
          ok: true,
          statusCode: 200,
          email: data.user.email,
          userId: data.user.id
        };
      } catch (err) {
        console.error(`Supabase magic-link verify error: ${err.message}`);
        return {
          ok: false,
          statusCode: 500,
          error: 'Internal provider error',
          code: 'verify_error'
        };
      }
    }

    return {
      ok: false,
      statusCode: 400,
      error: 'Magic-link verification is available only when AUTH_PROVIDER=supabase',
      code: 'provider_not_supported'
    };
  }

  return {
    providerName,
    getPublicStatus,
    requestMagicLink,
    verifyMagicLinkToken
  };
}

module.exports = {
  createAuthProvider
};
