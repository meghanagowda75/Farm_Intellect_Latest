import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  hasSupabaseEnv,
  supabase,
} from "@/integrations/supabase/client";
import type {
  User as SupabaseUser,
  Session as SupabaseSession,
} from "@supabase/supabase-js";
import {
  getSecureItem,
  setSecureItem,
  removeSecureItem,
} from "@/lib/secure-storage";

interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  state?: string;
  district?: string;
  village?: string;
  profile_picture_url?: string;
  bio?: string;
  language_preference?: string;
  created_at?: string;
  role: "farmer" | "merchant" | "expert" | "admin";
}

interface RegistrationMetadata {
  first_name: string;
  role: "farmer" | "merchant" | "expert" | "admin";
  phone_number?: string;
  state?: string;
  district?: string;
  village?: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
  profile: UserProfile | null;
  loading: boolean;
  signUpWithAadhaar: (
    aadhaar: string,
    passkey: string,
    metadata: RegistrationMetadata
  ) => Promise<{ error: Error | null }>;
  signInWithAadhaar: (
    aadhaar: string,
    passkey: string
  ) => Promise<{ error: Error | null }>;
  signInWithPhoneOTP: (
    phone: string,
    role: string,
    name?: string
  ) => Promise<{ otp: string; error: Error | null }>;
  verifyPhoneOTP: (
    phone: string,
    otp: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface MockUserRecord {
  passkey?: string;
  user: any;
  profile: UserProfile;
  created_at?: string;
}

const pendingOTPs = new Map<
  string,
  { otp: string; password: string; expiresAt: number }
>();

const BACKEND_NOT_CONFIGURED_ERROR =
  "Backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env.";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const aadhaarToEmail = (aadhaar: string) =>
  `aadhaar_${aadhaar.replace(/\s/g, "")}@farmapp.local.io`;

const phoneToEmail = (phone: string) =>
  `phone_${phone.replace(/\D/g, "")}@farmapp.local.io`;

const MOCK_PROFILES: Record<
  string,
  {
    role: "farmer" | "merchant" | "expert" | "admin";
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    location: string;
  }
> = {
  "123412341234": {
    role: "farmer",
    first_name: "Rajesh",
    last_name: "Kumar",
    email: "rajesh@farmapp.local.io",
    phone: "+919876543210",
    location: "Karnal, Haryana",
  },
  "222222222222": {
    role: "expert",
    first_name: "Dr. Kavita",
    last_name: "Sharma",
    email: "kavita@farmapp.local.io",
    phone: "+919876543211",
    location: "IARI, New Delhi",
  },
  "333333333333": {
    role: "merchant",
    first_name: "Anil",
    last_name: "Gupta",
    email: "anil@farmapp.local.io",
    phone: "+919876543212",
    location: "Mandi, Punjab",
  },
  "444444444444": {
    role: "admin",
    first_name: "System",
    last_name: "Administrator",
    email: "admin@farmapp.local.io",
    phone: "+919876543213",
    location: "New Delhi, Delhi",
  },
};

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (
    userId: string
  ): Promise<UserProfile | null> => {
    try {
      if (!hasSupabaseEnv) {
        const savedSession = getSecureItem<any>(
          "mock_user_session",
          null
        );

        if (savedSession?.profile?.id === userId) {
          setProfile(savedSession.profile);
          return savedSession.profile;
        }

        const mockUsers = getSecureItem<
          Record<string, MockUserRecord>
        >("mock_registered_users", {});

        const matchedUser = Object.values(mockUsers).find(
          (record) =>
            record.user?.id === userId ||
            record.profile?.id === userId
        );

        if (matchedUser) {
          setProfile(matchedUser.profile);
          return matchedUser.profile;
        }

        const cleanAadhaar = userId.replace("mock-user-", "");
        const demo = MOCK_PROFILES[cleanAadhaar];

        if (demo) {
          const nextProfile: UserProfile = {
            id: userId,
            first_name: demo.first_name,
            last_name: demo.last_name,
            email: demo.email,
            phone_number: demo.phone,
            state: demo.location.split(",")[1]?.trim(),
            district: demo.location.split(",")[0]?.trim(),
            role: demo.role,
          };

          setProfile(nextProfile);
          return nextProfile;
        }

        setProfile(null);
        return null;
      }

      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single(),
      ]);

      const { data: profileData, error: profileError } =
        profileResult;
      const { data: roleData, error: roleError } = roleResult;

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setProfile(null);
        return null;
      }

      if (roleError) {
        console.warn(
          "Role lookup failed; defaulting to farmer."
        );
      }

      if (!profileData) {
        setProfile(null);
        return null;
      }

      const locationParts =
        profileData.location
          ?.split(",")
          .map((part: string) => part.trim()) || [];

      const nextProfile: UserProfile = {
        id: profileData.user_id,
        first_name:
          profileData.display_name?.split(" ")[0] || undefined,
        last_name:
          profileData.display_name
            ?.split(" ")
            .slice(1)
            .join(" ") || undefined,
        email: profileData.email || undefined,
        phone_number: profileData.phone || undefined,
        state: locationParts[1] || undefined,
        district: locationParts[0] || undefined,
        profile_picture_url: profileData.avatar_url || undefined,
        language_preference:
          profileData.language_preference ||
          localStorage.getItem("app-language") ||
          "en",
        created_at: profileData.created_at || undefined,
        role: (roleData?.role ||
          "farmer") as UserProfile["role"],
      };

      setProfile(nextProfile);
      return nextProfile;
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    if (!hasSupabaseEnv) {
      const savedSession = getSecureItem<any>(
        "mock_user_session",
        null
      );

      if (savedSession?.user) {
        setUser(savedSession.user);
        setProfile(savedSession.profile || null);
        setSession({
          access_token: "mock-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "mock-refresh-token",
          user: savedSession.user,
        } as any);
      }

      setLoading(false);
      return;
    }

    const setupAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth setup error:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    void setupAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUpWithAadhaar = async (
    aadhaar: string,
    passkey: string,
    metadata: RegistrationMetadata
  ): Promise<{ error: Error | null }> => {
    if (!hasSupabaseEnv) {
      const cleanAadhaar = aadhaar.replace(/\s/g, "");

      const mockUsers = getSecureItem<
        Record<string, MockUserRecord>
      >("mock_registered_users", {});

      if (
        MOCK_PROFILES[cleanAadhaar] ||
        mockUsers[cleanAadhaar]
      ) {
        return {
          error: new Error(
            "This Aadhaar is already registered. Please sign in instead."
          ),
        };
      }

      const createdAt = new Date().toISOString();

      const mockUser = {
        id: `mock-user-${cleanAadhaar}`,
        email: `${cleanAadhaar}@farmapp.local.io`,
        phone: metadata.phone_number || "",
        created_at: createdAt,
        user_metadata: metadata,
      } as any;

      const mockProfile: UserProfile = {
        id: mockUser.id,
        first_name: metadata.first_name,
        email: mockUser.email,
        phone_number: metadata.phone_number,
        state: metadata.state,
        district: metadata.district,
        village: metadata.village,
        role: metadata.role,
        created_at: createdAt,
      };

      mockUsers[cleanAadhaar] = {
        passkey,
        user: mockUser,
        profile: mockProfile,
        created_at: createdAt,
      };

      setSecureItem("mock_registered_users", mockUsers);

      setUser(mockUser);
      setProfile(mockProfile);

      const mockSession = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: mockUser,
      } as any;

      setSession(mockSession);

      setSecureItem("mock_user_session", {
        user: mockUser,
        profile: mockProfile,
      });

      return { error: null };
    }

    const email = aadhaarToEmail(aadhaar);

    const { error } = await supabase.auth.signUp({
      email,
      password: passkey,
      options: {
        data: {
          ...metadata,
          display_name: metadata.first_name,
          name: metadata.first_name,
          role: metadata.role,
          phone_number: metadata.phone_number,
          state: metadata.state,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      const enhancedError = new Error(error.message);

      if (error.message?.includes("rate_limit")) {
        enhancedError.message =
          "Too many signup attempts. Please wait a few minutes and try again.";
      }

      return { error: enhancedError };
    }

    return { error: null };
  };

  const signInWithAadhaar = async (
    aadhaar: string,
    passkey: string
  ): Promise<{ error: Error | null }> => {
    const cleanAadhaar = aadhaar.replace(/\s/g, "");

    if (!hasSupabaseEnv) {
      const demo = MOCK_PROFILES[cleanAadhaar];

      if (demo) {
        const defaultPasskey = cleanAadhaar.slice(-4);

        if (passkey !== defaultPasskey) {
          return {
            error: new Error(
              "Invalid passkey. For demo users, the passkey is the last 4 digits of the Aadhaar."
            ),
          };
        }

        const mockUser = {
          id: `mock-user-${cleanAadhaar}`,
          email: demo.email,
          phone: demo.phone,
          user_metadata: {
            first_name: demo.first_name,
            role: demo.role,
          },
        } as any;

        const mockProfile: UserProfile = {
          id: mockUser.id,
          first_name: demo.first_name,
          last_name: demo.last_name,
          email: demo.email,
          phone_number: demo.phone,
          state: demo.location.split(",")[1]?.trim(),
          district: demo.location.split(",")[0]?.trim(),
          role: demo.role,
        };

        setUser(mockUser);
        setProfile(mockProfile);

        const mockSession = {
          access_token: "mock-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "mock-refresh-token",
          user: mockUser,
        } as any;

        setSession(mockSession);

        setSecureItem("mock_user_session", {
          user: mockUser,
          profile: mockProfile,
        });

        return { error: null };
      }

      const mockUsers = getSecureItem<
        Record<string, MockUserRecord>
      >("mock_registered_users", {});

      const record = mockUsers[cleanAadhaar];

      if (!record) {
        return {
          error: new Error(
            "Aadhaar number not registered. Please sign up first."
          ),
        };
      }

      if (record.passkey !== passkey) {
        return {
          error: new Error(
            "Invalid passkey. Please try again."
          ),
        };
      }

      // Preserve older accounts that don't yet have a timestamp.
      const createdAt =
        record.profile.created_at ||
        record.created_at ||
        record.user.created_at;

      if (createdAt) {
        record.profile.created_at = createdAt;
        record.created_at = createdAt;
        record.user.created_at = createdAt;
        mockUsers[cleanAadhaar] = record;
        setSecureItem("mock_registered_users", mockUsers);
      }

      setUser(record.user);
      setProfile(record.profile);

      const mockSession = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: record.user,
      } as any;

      setSession(mockSession);

      setSecureItem("mock_user_session", {
        user: record.user,
        profile: record.profile,
      });

      return { error: null };
    }

    const email = aadhaarToEmail(aadhaar);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passkey,
    });

    return { error: error ? (error as Error) : null };
  };

  const signInWithPhoneOTP = async (
    phone: string,
    role: string,
    name?: string
  ): Promise<{ otp: string; error: Error | null }> => {
    const cleanPhone = phone.replace(/\D/g, "");

    if (!hasSupabaseEnv) {
      const generatedOTP = "123456";
      const tempPassword = `mock_otp_${generatedOTP}_${Date.now()}`;

      pendingOTPs.set(cleanPhone, {
        otp: generatedOTP,
        password: tempPassword,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });

      return { otp: generatedOTP, error: null };
    }

    const email = phoneToEmail(cleanPhone);
    const otpArray = new Uint32Array(1);

    crypto.getRandomValues(otpArray);

    const generatedOTP = String(
      100000 + (otpArray[0] % 900000)
    );

    const tempPassword = `otp_${generatedOTP}_${Date.now()}`;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          first_name: name || cleanPhone,
          display_name: name || cleanPhone,
          name: name || cleanPhone,
          role,
          phone_number: `+91${cleanPhone}`,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (
      signUpError &&
      !signUpError.message?.includes("already registered")
    ) {
      console.error("Phone signup notice:", signUpError.message);
    }

    pendingOTPs.set(cleanPhone, {
      otp: generatedOTP,
      password: tempPassword,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return { otp: generatedOTP, error: null };
  };

  const verifyPhoneOTP = async (
    phone: string,
    otpCode: string
  ): Promise<{ error: Error | null }> => {
    const cleanPhone = phone.replace(/\D/g, "");
    const pending = pendingOTPs.get(cleanPhone);

    if (!pending || pending.otp !== otpCode) {
      return {
        error: new Error(
          hasSupabaseEnv
            ? "Invalid OTP. Please try again."
            : "Invalid OTP. Please enter 123456."
        ),
      };
    }

    if (Date.now() > pending.expiresAt) {
      pendingOTPs.delete(cleanPhone);

      return {
        error: new Error(
          "OTP expired. Please request a new one."
        ),
      };
    }

    if (!hasSupabaseEnv) {
      pendingOTPs.delete(cleanPhone);

      const mockUsers = getSecureItem<
        Record<string, MockUserRecord>
      >("mock_registered_users", {});

      const existingUser = Object.values(mockUsers).find(
        (record) =>
          record.profile?.phone_number === `+91${cleanPhone}` ||
          record.profile?.phone_number === cleanPhone
      );

      const createdAt =
        existingUser?.profile.created_at ||
        existingUser?.created_at ||
        new Date().toISOString();

      const mockUser =
        existingUser?.user ||
        ({
          id: `mock-user-phone-${cleanPhone}`,
          email: `${cleanPhone}@farmapp.local.io`,
          phone: `+91${cleanPhone}`,
          created_at: createdAt,
          user_metadata: {
            first_name: `User ${cleanPhone}`,
            role: "farmer",
          },
        } as any);

      const mockProfile: UserProfile =
        existingUser?.profile || {
          id: mockUser.id,
          first_name: `User`,
          last_name: cleanPhone,
          email: mockUser.email,
          phone_number: mockUser.phone,
          role: "farmer",
          created_at: createdAt,
        };

      if (existingUser) {
        existingUser.created_at = createdAt;
        existingUser.profile.created_at = createdAt;
        existingUser.user.created_at =
          existingUser.user.created_at || createdAt;

        setSecureItem("mock_registered_users", mockUsers);
      }

      setUser(mockUser);
      setProfile(mockProfile);

      const mockSession = {
        access_token: "mock-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: mockUser,
      } as any;

      setSession(mockSession);

      setSecureItem("mock_user_session", {
        user: mockUser,
        profile: mockProfile,
      });

      return { error: null };
    }

    const email = phoneToEmail(cleanPhone);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pending.password,
    });

    pendingOTPs.delete(cleanPhone);

    if (error) {
      return { error: error as Error };
    }

    return { error: null };
  };

  const signOut = async () => {
    if (hasSupabaseEnv) {
      await supabase.auth.signOut();
    }

    setSession(null);
    setUser(null);
    setProfile(null);

    removeSecureItem("mock_user_session");
    removeSecureItem("farmer_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUpWithAadhaar,
        signInWithAadhaar,
        signInWithPhoneOTP,
        verifyPhoneOTP,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};

export const useAuthSafe = () => {
  return useContext(AuthContext);
};