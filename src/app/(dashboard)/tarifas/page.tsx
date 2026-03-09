
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Settings2, Trash2, Edit2, Wallet } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore"

export default function TarifasPage() {
  const { firestore } = useFirestore()
  const { user } = useUser()

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null
    return doc(firestore, "staff_roles", user.uid)
  }, [firestore, user])
  const { data: profile } = useDoc(profileRef)
  
  const feesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.schoolId) return null;
    return query(collection(firestore, "fee_types"), where("schoolId", "==", profile.schoolId));
  }, [firestore, profile])

  const { data: fees, isLoading } = useCollection(feesQuery)

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [newFee, setNewFee] = React.useState({
    name: "",
    baseAmount: 0,
    currency: "MXN",
  })

  const handleAddFee = async () => {
    if (!newFee.name || isNaN(newFee.baseAmount) || !firestore || !profile?.schoolId) {
      toast({
        variant: "destructive",
        title: "Campos inválidos",
        description: "Asegúrate de ingresar un nombre y un monto válido.",
      })
      return
    }

    try {
      addDocumentNonBlocking(collection(firestore, "fee_types"), {
        ...newFee,
        schoolId: profile.schoolId,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setIsAddDialogOpen(false)
      setNewFee({ name: "", baseAmount: 0, currency: "MXN" })
      toast({
        title: "Tarifa creada",
        description: `Se ha añadido ${newFee.name} al catálogo.`,
      })
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la tarifa.",
      })
    }
  }

  const handleDeleteFee = (id: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "fee_types", id))
    toast({
      title: "Tarifa eliminada",
      description: "El concepto de cobro ha sido removido.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary">Configuración de Tarifas</h2>
          <p className="text-muted-foreground">Define los montos y conceptos de cobro escolar.</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nueva Tarifa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Nuevo Concepto</DialogTitle>
              <DialogDescription>Define una nueva tarifa para el ciclo escolar.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nombre del Concepto</Label>
                <Input 
                  placeholder="Ej. Inscripción Extraordinaria" 
                  value={newFee.name}
                  onChange={(e) => setNewFee({...newFee, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select 
                    value={newFee.currency} 
                    onValueChange={(v) => setNewFee({...newFee, currency: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN">MXN</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monto Base</Label>
                  <Input 
                    type="number" 
                    value={isNaN(newFee.baseAmount) || newFee.baseAmount === 0 ? "" : newFee.baseAmount}
                    onChange={(e) => {
                      const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                      setNewFee({...newFee, baseAmount: isNaN(val) ? 0 : val});
                    }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddFee}>Guardar Tarifa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="col-span-full text-center py-12">Cargando tarifas...</p>
        ) : fees?.length ? fees.map((fee) => (
          <Card key={fee.id} className="relative group overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <Badge className="mb-2" variant="outline">{fee.isActive ? 'Activo' : 'Inactivo'}</Badge>
                <Wallet className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <CardTitle className="font-headline text-xl">{fee.name}</CardTitle>
              <CardDescription>Costo estándar por ciclo escolar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                ${(fee.baseAmount || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{fee.currency}</span>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 pt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <Edit2 className="h-3 w-3" /> Editar
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-destructive hover:text-destructive gap-1"
                onClick={() => handleDeleteFee(fee.id)}
              >
                <Trash2 className="h-3 w-3" /> Eliminar
              </Button>
            </CardFooter>
          </Card>
        )) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No hay tarifas configuradas para esta escuela. Comienza añadiendo una nueva.
          </div>
        )}
        
        <button 
          onClick={() => setIsAddDialogOpen(true)}
          className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg p-12 text-muted-foreground hover:border-primary hover:text-primary transition-all group"
        >
          <Settings2 className="h-12 w-12 mb-4 group-hover:rotate-45 transition-transform" />
          <span className="font-medium">Personalizar Catálogo</span>
          <p className="text-xs mt-2 text-center">Añade categorías personalizadas para eventos especiales.</p>
        </button>
      </div>
    </div>
  )
}
