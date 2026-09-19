export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          created_at: string
          email: string | null
          estado: string
          id: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          estado?: string
          id?: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          estado?: string
          id?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      config_areas: {
        Row: {
          alerta_activa: boolean
          area: string
          created_at: string
          horas_objetivo: number
          id: string
          sede_id: string | null
          updated_at: string
        }
        Insert: {
          alerta_activa?: boolean
          area: string
          created_at?: string
          horas_objetivo?: number
          id?: string
          sede_id?: string | null
          updated_at?: string
        }
        Update: {
          alerta_activa?: boolean
          area?: string
          created_at?: string
          horas_objetivo?: number
          id?: string
          sede_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_areas_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      config_sistema: {
        Row: {
          clave: string
          created_at: string
          updated_at: string
          valor: Json
        }
        Insert: {
          clave: string
          created_at?: string
          updated_at?: string
          valor?: Json
        }
        Update: {
          clave?: string
          created_at?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      contrato_pagos: {
        Row: {
          concepto: string
          contrato_id: string | null
          contrato_numero: string
          created_at: string
          fecha: string
          id: string
          monto: number
          usuario_id: string | null
        }
        Insert: {
          concepto?: string
          contrato_id?: string | null
          contrato_numero?: string
          created_at?: string
          fecha?: string
          id?: string
          monto?: number
          usuario_id?: string | null
        }
        Update: {
          concepto?: string
          contrato_id?: string | null
          contrato_numero?: string
          created_at?: string
          fecha?: string
          id?: string
          monto?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contrato_pagos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_pagos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          abonado: number
          cliente: string
          created_at: string
          id: string
          notas: string
          numero: string
          origen: string
          sede_id: string | null
          telefono: string
          total: number
          updated_at: string
        }
        Insert: {
          abonado?: number
          cliente?: string
          created_at?: string
          id?: string
          notas?: string
          numero: string
          origen?: string
          sede_id?: string | null
          telefono?: string
          total?: number
          updated_at?: string
        }
        Update: {
          abonado?: number
          cliente?: string
          created_at?: string
          id?: string
          notas?: string
          numero?: string
          origen?: string
          sede_id?: string | null
          telefono?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_detalles: {
        Row: {
          cantidad: number
          costo_unitario: number
          cotizacion_id: string
          created_at: string
          descripcion: string
          id: string
          orden: number
          precio_unitario: number
          tipo: string
          total_costo: number
          total_precio: number
          unidad: string
        }
        Insert: {
          cantidad?: number
          costo_unitario?: number
          cotizacion_id: string
          created_at?: string
          descripcion?: string
          id?: string
          orden?: number
          precio_unitario?: number
          tipo?: string
          total_costo?: number
          total_precio?: number
          unidad?: string
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          cotizacion_id?: string
          created_at?: string
          descripcion?: string
          id?: string
          orden?: number
          precio_unitario?: number
          tipo?: string
          total_costo?: number
          total_precio?: number
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_detalles_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          anticipo: number
          cliente_id: string | null
          creado_por: string | null
          created_at: string
          descuento: number
          estado: string
          fecha_emision: string
          fecha_entrega_solicitada: string | null
          fecha_vencimiento: string | null
          id: string
          impuestos: number
          moneda: string
          notas_cliente: string
          notas_internas: string
          numero: string
          proyecto_joya_id: string | null
          sede_id: string | null
          subtotal: number
          subtotal_costo: number
          total: number
          updated_at: string
          version: number
        }
        Insert: {
          anticipo?: number
          cliente_id?: string | null
          creado_por?: string | null
          created_at?: string
          descuento?: number
          estado?: string
          fecha_emision?: string
          fecha_entrega_solicitada?: string | null
          fecha_vencimiento?: string | null
          id?: string
          impuestos?: number
          moneda?: string
          notas_cliente?: string
          notas_internas?: string
          numero?: string
          proyecto_joya_id?: string | null
          sede_id?: string | null
          subtotal?: number
          subtotal_costo?: number
          total?: number
          updated_at?: string
          version?: number
        }
        Update: {
          anticipo?: number
          cliente_id?: string | null
          creado_por?: string | null
          created_at?: string
          descuento?: number
          estado?: string
          fecha_emision?: string
          fecha_entrega_solicitada?: string | null
          fecha_vencimiento?: string | null
          id?: string
          impuestos?: number
          moneda?: string
          notas_cliente?: string
          notas_internas?: string
          numero?: string
          proyecto_joya_id?: string | null
          sede_id?: string | null
          subtotal?: number
          subtotal_costo?: number
          total?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_proyecto_joya_id_fkey"
            columns: ["proyecto_joya_id"]
            isOneToOne: false
            referencedRelation: "proyectos_joya"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosistema_participantes: {
        Row: {
          ciudad: string | null
          created_at: string
          descripcion: string | null
          email: string | null
          estado: string
          id: string
          nombre: string
          notas_owner: string | null
          razon_social: string | null
          telefono: string | null
          tipo_participante: string
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          descripcion?: string | null
          email?: string | null
          estado?: string
          id?: string
          nombre: string
          notas_owner?: string | null
          razon_social?: string | null
          telefono?: string | null
          tipo_participante?: string
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          descripcion?: string | null
          email?: string | null
          estado?: string
          id?: string
          nombre?: string
          notas_owner?: string | null
          razon_social?: string | null
          telefono?: string | null
          tipo_participante?: string
          updated_at?: string
        }
        Relationships: []
      }
      especialidades: {
        Row: {
          activa: boolean
          categoria: string | null
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      gastos: {
        Row: {
          categoria: string
          concepto: string
          created_at: string
          fecha: string
          id: string
          importe: number
          sede_id: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          categoria?: string
          concepto?: string
          created_at?: string
          fecha?: string
          id?: string
          importe?: number
          sede_id?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          categoria?: string
          concepto?: string
          created_at?: string
          fecha?: string
          id?: string
          importe?: number
          sede_id?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario: {
        Row: {
          categoria: string
          created_at: string
          id: string
          material: string
          minimo: number
          sede_id: string | null
          stock: number
          unidad: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          id?: string
          material: string
          minimo?: number
          sede_id?: string | null
          stock?: number
          unidad?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          material?: string
          minimo?: number
          sede_id?: string | null
          stock?: number
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_movimientos: {
        Row: {
          area: string
          cantidad: number
          created_at: string
          id: string
          material_id: string
          motivo: string
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          area?: string
          cantidad: number
          created_at?: string
          id?: string
          material_id: string
          motivo?: string
          tipo?: string
          usuario_id?: string | null
        }
        Update: {
          area?: string
          cantidad?: number
          created_at?: string
          id?: string
          material_id?: string
          motivo?: string
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_movimientos_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      material_areas: {
        Row: {
          area: string
          created_at: string
          id: string
          material_id: string
        }
        Insert: {
          area: string
          created_at?: string
          id?: string
          material_id: string
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_areas_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      participante_cuentas: {
        Row: {
          created_at: string
          estado: string
          id: string
          participante_id: string
          relacion: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          participante_id: string
          relacion?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          participante_id?: string
          relacion?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participante_cuentas_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      participante_especialidades: {
        Row: {
          created_at: string
          especialidad_id: string
          id: string
          participante_id: string
        }
        Insert: {
          created_at?: string
          especialidad_id: string
          id?: string
          participante_id: string
        }
        Update: {
          created_at?: string
          especialidad_id?: string
          id?: string
          participante_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participante_especialidades_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participante_especialidades_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_archivos: {
        Row: {
          created_at: string
          es_enlace: boolean
          grupo: string
          id: string
          nombre: string
          pedido_id: string
          poster: string
          tipo: string
          url: string
          version: number
        }
        Insert: {
          created_at?: string
          es_enlace?: boolean
          grupo?: string
          id?: string
          nombre?: string
          pedido_id: string
          poster?: string
          tipo?: string
          url: string
          version?: number
        }
        Update: {
          created_at?: string
          es_enlace?: boolean
          grupo?: string
          id?: string
          nombre?: string
          pedido_id?: string
          poster?: string
          tipo?: string
          url?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_archivos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_movimientos: {
        Row: {
          accion: string
          area_destino: string
          area_origen: string
          created_at: string
          id: string
          nota: string
          pedido_id: string
          usuario_id: string | null
        }
        Insert: {
          accion?: string
          area_destino: string
          area_origen?: string
          created_at?: string
          id?: string
          nota?: string
          pedido_id: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          area_destino?: string
          area_origen?: string
          created_at?: string
          id?: string
          nota?: string
          pedido_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_movimientos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          area_actual: string
          area_desde: string
          cantidad_piezas: number
          cliente: string
          contrato: string
          contrato_id: string | null
          corte_observaciones: string
          corte_texto: string
          corte_tipografia: string
          corte_ubicacion: string
          cotizacion_detalles: Json | null
          cotizacion_id: string | null
          created_at: string
          entrega: string
          entregado_at: string | null
          enviado_at: string | null
          especificaciones_comerciales: Json | null
          estado: string
          fecha_entrega: string | null
          fecha_entregado: string | null
          fecha_envio: string | null
          fecha_ingreso: string
          fecha_listo_entrega: string | null
          guia_envio: string
          id: string
          importe: number
          a_cuenta: number
          saldo: number
          listo_entrega_observaciones: string | null
          material: string
          medio_envio: string
          notas: string
          notas_entrega: string | null
          notas_envio: string | null
          notas_ventas: string
          origen: string
          packing_estado: string
          peso_estimado: string
          piedras: string
          pieza: string
          proyecto_joya_id: string | null
          receptor_envio: string
          referencia: string
          ruta: string[]
          sede_id: string | null
          talla: string
          telefono: string
          trabajo: string
          updated_at: string
          usuario_entrega: string | null
          usuario_envio: string | null
          usuario_listo_entrega: string | null
          ventas_actualizado_en: string | null
          ventas_actualizado_por: string | null
          ventas_estado: string
        }
        Insert: {
          area_actual?: string
          area_desde?: string
          cantidad_piezas?: number
          cliente: string
          contrato?: string
          contrato_id?: string | null
          corte_observaciones?: string
          corte_texto?: string
          corte_tipografia?: string
          corte_ubicacion?: string
          cotizacion_detalles?: Json | null
          cotizacion_id?: string | null
          created_at?: string
          entrega?: string
          entregado_at?: string | null
          enviado_at?: string | null
          especificaciones_comerciales?: Json | null
          estado?: string
          fecha_entrega?: string | null
          fecha_entregado?: string | null
          fecha_envio?: string | null
          fecha_ingreso?: string
          fecha_listo_entrega?: string | null
          guia_envio?: string
          id?: string
          importe?: number
          listo_entrega_observaciones?: string | null
          material: string
          medio_envio?: string
          notas?: string
          notas_entrega?: string | null
          notas_envio?: string | null
          notas_ventas?: string
          origen?: string
          packing_estado?: string
          peso_estimado?: string
          piedras?: string
          pieza: string
          proyecto_joya_id?: string | null
          receptor_envio?: string
          referencia: string
          ruta?: string[]
          sede_id?: string | null
          talla?: string
          telefono?: string
          trabajo?: string
          updated_at?: string
          usuario_entrega?: string | null
          usuario_envio?: string | null
          usuario_listo_entrega?: string | null
          ventas_actualizado_en?: string | null
          ventas_actualizado_por?: string | null
          ventas_estado?: string
        }
        Update: {
          area_actual?: string
          area_desde?: string
          cantidad_piezas?: number
          cliente?: string
          contrato?: string
          contrato_id?: string | null
          corte_observaciones?: string
          corte_texto?: string
          corte_tipografia?: string
          corte_ubicacion?: string
          cotizacion_detalles?: Json | null
          cotizacion_id?: string | null
          created_at?: string
          entrega?: string
          entregado_at?: string | null
          enviado_at?: string | null
          especificaciones_comerciales?: Json | null
          estado?: string
          fecha_entrega?: string | null
          fecha_entregado?: string | null
          fecha_envio?: string | null
          fecha_ingreso?: string
          fecha_listo_entrega?: string | null
          guia_envio?: string
          id?: string
          importe?: number
          listo_entrega_observaciones?: string | null
          material?: string
          medio_envio?: string
          notas?: string
          notas_entrega?: string | null
          notas_envio?: string | null
          notas_ventas?: string
          origen?: string
          packing_estado?: string
          peso_estimado?: string
          piedras?: string
          pieza?: string
          proyecto_joya_id?: string | null
          receptor_envio?: string
          referencia?: string
          ruta?: string[]
          sede_id?: string | null
          talla?: string
          telefono?: string
          trabajo?: string
          updated_at?: string
          usuario_entrega?: string | null
          usuario_envio?: string | null
          usuario_listo_entrega?: string | null
          ventas_actualizado_en?: string | null
          ventas_actualizado_por?: string | null
          ventas_estado?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_proyecto_joya_id_fkey"
            columns: ["proyecto_joya_id"]
            isOneToOne: false
            referencedRelation: "proyectos_joya"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      procesos: {
        Row: {
          cliente: string
          created_at: string
          detalle: string
          fase: string
          id: string
          pieza: string
          progreso: number
          referencia: string
          sede_id: string | null
          updated_at: string
        }
        Insert: {
          cliente?: string
          created_at?: string
          detalle?: string
          fase: string
          id?: string
          pieza: string
          progreso?: number
          referencia: string
          sede_id?: string | null
          updated_at?: string
        }
        Update: {
          cliente?: string
          created_at?: string
          detalle?: string
          fase?: string
          id?: string
          pieza?: string
          progreso?: number
          referencia?: string
          sede_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procesos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acceso_desde: string | null
          acceso_hasta: string | null
          activo: boolean
          clave_visible: string | null
          created_at: string
          dni: string
          id: string
          nombre: string
          sede_id: string | null
          telefono: string
          updated_at: string
        }
        Insert: {
          acceso_desde?: string | null
          acceso_hasta?: string | null
          activo?: boolean
          clave_visible?: string | null
          created_at?: string
          dni?: string
          id: string
          nombre?: string
          sede_id?: string | null
          telefono?: string
          updated_at?: string
        }
        Update: {
          acceso_desde?: string | null
          acceso_hasta?: string | null
          activo?: boolean
          clave_visible?: string | null
          created_at?: string
          dni?: string
          id?: string
          nombre?: string
          sede_id?: string | null
          telefono?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos_joya: {
        Row: {
          cliente_id: string | null
          codigo: string
          created_at: string
          descripcion: string
          id: string
          ley: string | null
          metal: string | null
          nombre: string
          peso_estimado: number | null
          piedras: string | null
          talla: string | null
        }
        Insert: {
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string
          id?: string
          ley?: string | null
          metal?: string | null
          nombre: string
          peso_estimado?: number | null
          piedras?: string | null
          talla?: string | null
        }
        Update: {
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string
          id?: string
          ley?: string | null
          metal?: string | null
          nombre?: string
          peso_estimado?: number | null
          piedras?: string | null
          talla?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_joya_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string
          user_id?: string
        }
        Relationships: []
      }
      sedes: {
        Row: {
          activa: boolean
          ciudad: string
          created_at: string
          id: string
          modo: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          ciudad?: string
          created_at?: string
          id?: string
          modo?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          ciudad?: string
          created_at?: string
          id?: string
          modo?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitudes_acceso: {
        Row: {
          ciudad: string | null
          created_at: string
          descripcion: string | null
          documento: string | null
          email: string
          empresa: string | null
          especialidades: string[]
          estado: string
          id: string
          nombre: string
          notas_owner: string | null
          revisado_at: string | null
          revisado_por: string | null
          telefono: string | null
          tipo_solicitante: string
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          created_at?: string
          descripcion?: string | null
          documento?: string | null
          email: string
          empresa?: string | null
          especialidades?: string[]
          estado?: string
          id?: string
          nombre: string
          notas_owner?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          telefono?: string | null
          tipo_solicitante: string
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          descripcion?: string | null
          documento?: string | null
          email?: string
          empresa?: string | null
          especialidades?: string[]
          estado?: string
          id?: string
          nombre?: string
          notas_owner?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          telefono?: string | null
          tipo_solicitante?: string
          updated_at?: string
        }
        Relationships: []
      }
      tareas_taller: {
        Row: {
          banco: string
          created_at: string
          estado: string
          id: string
          responsable: string
          sede_id: string | null
          tarea: string
          updated_at: string
        }
        Insert: {
          banco?: string
          created_at?: string
          estado?: string
          id?: string
          responsable?: string
          sede_id?: string | null
          tarea: string
          updated_at?: string
        }
        Update: {
          banco?: string
          created_at?: string
          estado?: string
          id?: string
          responsable?: string
          sede_id?: string | null
          tarea?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_taller_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_areas: {
        Row: {
          area: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          area: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          sede_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          sede_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          sede_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cambiar_estado_cotizacion: {
        Args: { _cotizacion_id: string; _nuevo_estado: string }
        Returns: undefined
      }
      convertir_cotizacion_a_pedido_contrato: {
        Args: { _cotizacion_id: string }
        Returns: Json
      }
      crear_version_cotizacion: {
        Args: { _cotizacion_id: string }
        Returns: string
      }
      es_admin: { Args: { _user_id: string }; Returns: boolean }
      guardar_detalles_cotizacion: {
        Args: { _cotizacion_id: string; _detalles: Json }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mi_sede: { Args: { _user_id: string }; Returns: string }
      normaliza_area: { Args: { _area: string }; Returns: string }
      seguimiento_pedido: {
        Args: { _ref: string }
        Returns: {
          area_actual: string
          cliente: string
          estado: string
          fecha_entrega: string
          fecha_entregado: string
          fecha_envio: string
          guia_envio: string
          medio_envio: string
          receptor_envio: string
          referencia: string
          ruta: string[]
          sede: string
          trabajo: string
          ventas_estado: string
        }[]
      }
      ve_sede: {
        Args: { _sede_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "dueno" | "gerente" | "operario" | "monitor" | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["dueno", "gerente", "operario", "monitor", "cliente"],
    },
  },
} as const
