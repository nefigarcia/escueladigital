'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

/** 
 * Initiate anonymous sign-in (non-blocking). 
 */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch((error) => {
    toast({
      variant: "destructive",
      title: "Error de Autenticación",
      description: error.message || "No se pudo iniciar sesión de forma anónima.",
    });
  });
}

/** 
 * Initiate email/password sign-up (non-blocking). 
 * Note: Components should ideally handle the returned promise for specific loading/error states.
 */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string) {
  return createUserWithEmailAndPassword(authInstance, email, password).catch((error) => {
    toast({
      variant: "destructive",
      title: "Error de Registro",
      description: error.message || "No se pudo crear la cuenta.",
    });
    throw error; // Re-throw to allow component to stop loading state
  });
}

/** 
 * Initiate email/password sign-in (non-blocking). 
 */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string) {
  return signInWithEmailAndPassword(authInstance, email, password).catch((error) => {
    toast({
      variant: "destructive",
      title: "Error de Acceso",
      description: error.message || "Credenciales incorrectas o problema de conexión.",
    });
    throw error;
  });
}
