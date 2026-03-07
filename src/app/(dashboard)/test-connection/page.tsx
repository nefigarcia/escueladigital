
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useFirebase, useFirestore, useUser, initiateAnonymousSignIn } from "@/firebase"
import { collection, limit, query, getDocs } from "firebase/firestore"
import { CheckCircle2, XCircle, Loader2, Database, ShieldCheck, Cpu, LogIn } from "lucide-react"

export default function TestConnectionPage() {
  const [mounted, setMounted] = React.useState(false)
  const [firestoreStatus, setFirestoreStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  
  // areServicesAvailable is not returned by useFirebase, it's an internal check. 
  // If useFirebase returns without throwing, services are available.
  const { firebaseApp, auth } = useFirebase()
  const { user, isUserLoading } = useUser()
  const firestore = useFirestore()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const testFirestore = async () => {
    if (!firestore) return
    setFirestoreStatus('loading')
    setErrorMsg(null)
    
    try {
      // Attempt to fetch 1 document from the students collection to test read access
      const q = query(collection(firestore, "students"), limit(1))
      await getDocs(q)
      setFirestoreStatus('success')
    } catch (err: any) {
      console.error("Firestore Test Error:", err)
      setFirestoreStatus('error')
      setErrorMsg(err.message || "Error de permisos o conexión.")
    }
  }

  const handleLogin = () => {
    if (auth) {
      initiateAnonymousSignIn(auth)
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-headline font-bold text-primary">Diagnóstico de Conexión</h2>
        <p className="text-muted-foreground">Verifica el estado de los servicios de Firebase y la configuración del entorno.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Firebase SDK Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Core SDK</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {firebaseApp ? (
                <>
                  <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Inicializado</Badge>
                  <span className="text-xs text-muted-foreground">App: {firebaseApp.name}</span>
                </>
              ) : (
                <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> No Inicializado</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              ID del Proyecto: <span className="font-mono">{firebaseApp?.options.projectId || 'N/A'}</span>
            </p>
          </CardContent>
        </Card>

        {/* Auth Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Autenticación</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {isUserLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : user ? (
                <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Sesión Activa</Badge>
              ) : (
                <Badge variant="secondary">No Autenticado</Badge>
              )}
            </div>
            {!user && !isUserLoading && (
              <Button size="sm" variant="outline" className="w-full gap-2" onClick={handleLogin}>
                <LogIn className="h-4 w-4" /> Iniciar Sesión (Prueba)
              </Button>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              {user ? `UID: ${user.uid.substring(0, 8)}...` : 'Acceso como invitado / No logueado'}
            </p>
          </CardContent>
        </Card>

        {/* Firestore Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Firestore (Base de Datos)</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {firestoreStatus === 'idle' && <Badge variant="outline">Pendiente de Prueba</Badge>}
              {firestoreStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {firestoreStatus === 'success' && <Badge className="bg-emerald-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</Badge>}
              {firestoreStatus === 'error' && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Error</Badge>}
            </div>
            
            <Button 
              size="sm" 
              className="w-full" 
              onClick={testFirestore} 
              disabled={firestoreStatus === 'loading' || !user}
            >
              Probar Lectura Firestore
            </Button>

            {!user && (
              <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                Debes iniciar sesión para probar Firestore (según tus reglas de seguridad).
              </p>
            )}

            {errorMsg && (
              <div className="p-2 bg-destructive/10 text-destructive text-[10px] rounded border border-destructive/20 font-mono overflow-auto max-h-24">
                {errorMsg}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg">Guía de Solución de Problemas</CardTitle>
          <CardDescription>Si ves errores, verifica los siguientes puntos:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Sesión Activa:</strong> Tus reglas de seguridad requieren `isSignedIn()`. Usa el botón "Iniciar Sesión (Prueba)" arriba.
            </li>
            <li>
              <strong className="text-foreground">Configuración .env:</strong> Asegúrate de que las variables <code className="bg-muted px-1 rounded">NEXT_PUBLIC_FIREBASE_*</code> coincidan con las de tu consola de Firebase.
            </li>
            <li>
              <strong className="text-foreground">Reglas de Seguridad:</strong> Si estás logueado pero ves error de permisos, asegúrate de haber creado el documento en <code className="bg-muted px-1 rounded">/staff_roles/{user?.uid}</code> con el campo <code className="bg-muted px-1 rounded">role: "Administrador"</code>.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
