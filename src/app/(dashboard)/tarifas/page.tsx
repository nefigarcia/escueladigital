
"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Settings2, Trash2, Edit2, Wallet } from "lucide-react"
import { MOCK_FEES, Fee } from "@/lib/mock-data"
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

export default function TarifasPage() {
  const [fees, setFees] = React.useState<Fee[]>(MOCK_FEES)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [newFee, setNewFee] = React.useState<Partial<Fee>>({
    name: "",
    amount: 0,
    type: "mensualidad",
  })

  const handleAddFee = () => {
    if (!newFee.name || !newFee.amount) return

    const fee: Fee = {
      id: `f-${Math.random().toString(36).substr(2, 5)}`,
      name: newFee.name,
      amount: newFee.amount,
      type: newFee.type as any,
    }

    setFees([...fees, fee])
    setIsAddDialogOpen(false)
    setNewFee({ name: "", amount: 0, type: "mensualidad" })
    toast({
      title: "Tarifa creada",
      description: `Se ha añadido ${fee.name} al catálogo.`,
    })
  }

  const handleDeleteFee = (id: string) => {
    setFees(fees.filter(f => f.id !== id))
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
                  <Label>Tipo</Label>
                  <Select 
                    value={newFee.type} 
                    onValueChange={(v) => setNewFee({...newFee, type: v as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensualidad">Mensualidad</SelectItem>
                      <SelectItem value="inscripcion">Inscripción</SelectItem>
                      <SelectItem value="materiales">Materiales</SelectItem>
                      <SelectItem value="otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monto (MXN)</Label>
                  <Input 
                    type="number" 
                    value={newFee.amount}
                    onChange={(e) => setNewFee({...newFee, amount: parseFloat(e.target.value)})}
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
        {fees.map((fee) => (
          <Card key={fee.id} className="relative group overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <Badge className="mb-2 capitalize" variant="outline">{fee.type}</Badge>
                <Wallet className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <CardTitle className="font-headline text-xl">{fee.name}</CardTitle>
              <CardDescription>Costo estándar por ciclo escolar 2024-2025.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                ${fee.amount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MXN</span>
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
        ))}
        
        <button className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg p-12 text-muted-foreground hover:border-primary hover:text-primary transition-all group">
          <Settings2 className="h-12 w-12 mb-4 group-hover:rotate-45 transition-transform" />
          <span className="font-medium">Personalizar Catálogo</span>
          <p className="text-xs mt-2 text-center">Añade categorías personalizadas para eventos especiales o cooperativas.</p>
        </button>
      </div>
    </div>
  )
}
