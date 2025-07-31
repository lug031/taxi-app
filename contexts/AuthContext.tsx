// contexts/AuthContext.tsx
import {
    confirmSignUp,
    getCurrentUser,
    resendSignUpCode,
    signIn,
    signOut,
    signUp,
} from "aws-amplify/auth";
import { router } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  username: string;
  userId: string;
  signInDetails?: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (
    username: string,
    password: string,
    email: string
  ) => Promise<{ nextStep: any }>;
  confirmSignUp: (username: string, confirmationCode: string) => Promise<void>;
  resendConfirmationCode: (username: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser({
        username: currentUser.username,
        userId: currentUser.userId,
        signInDetails: currentUser.signInDetails,
      });
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (username: string, password: string) => {
    try {
      const { isSignedIn, nextStep } = await signIn({ username, password });

      if (isSignedIn) {
        await checkAuthState(); // Refrescar el estado del usuario
        router.replace("/(tabs)");
      } else {
        // Manejar pasos adicionales si es necesario (MFA, etc.)
        console.log("Next step:", nextStep);
        throw new Error("Autenticación incompleta");
      }
    } catch (error: any) {
      console.error("Error en signIn:", error);
      throw new Error(getErrorMessage(error));
    }
  };

  const handleSignUp = async (
    username: string,
    password: string,
    email: string
  ) => {
    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });

      return { nextStep };
    } catch (error: any) {
      console.error("Error en signUp:", error);
      throw new Error(getErrorMessage(error));
    }
  };

  const handleConfirmSignUp = async (
    username: string,
    confirmationCode: string
  ) => {
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username,
        confirmationCode,
      });

      if (isSignUpComplete) {
        // Después de confirmar, el usuario puede hacer login
        return;
      }
    } catch (error: any) {
      console.error("Error en confirmSignUp:", error);
      throw new Error(getErrorMessage(error));
    }
  };

  const handleResendConfirmationCode = async (username: string) => {
    try {
      await resendSignUpCode({ username });
    } catch (error: any) {
      console.error("Error al reenviar código:", error);
      throw new Error(getErrorMessage(error));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setIsAuthenticated(false);
      router.replace("/login");
    } catch (error: any) {
      console.error("Error en signOut:", error);
      throw new Error(getErrorMessage(error));
    }
  };

  // Función helper para manejar mensajes de error
  const getErrorMessage = (error: any): string => {
    switch (error.name) {
      case "UserNotFoundException":
        return "Usuario no encontrado";
      case "NotAuthorizedException":
        return "Credenciales incorrectas";
      case "UserNotConfirmedException":
        return "Usuario no confirmado. Revisa tu email";
      case "CodeMismatchException":
        return "Código de verificación incorrecto";
      case "ExpiredCodeException":
        return "Código de verificación expirado";
      case "LimitExceededException":
        return "Demasiados intentos. Intenta más tarde";
      case "UsernameExistsException":
        return "Este usuario ya existe";
      default:
        return error.message || "Error desconocido";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        confirmSignUp: handleConfirmSignUp,
        resendConfirmationCode: handleResendConfirmationCode,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};
