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
      catalogo_colecciones: {
        Row: {
          created_at: string
          descripcion: string | null
          estado: string
          id: string
          nombre: string
          orden: number
          participante_id: string | null
          portada_url: string | null
          sede_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: string
          nombre: string
          orden?: number
          participante_id?: string | null
          portada_url?: string | null
          sede_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          estado?: string
          id?: string
          nombre?: string
          orden?: number
          participante_id?: string | null
          portada_url?: string | null
          sede_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_colecciones_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_colecciones_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_configuracion: {
        Row: {
          created_at: string
          descripcion_publica: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          nombre_publico: string
          participante_id: string | null
          portada_url: string | null
          sede_id: string
          slug: string
          updated_at: string
          visible: boolean
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          descripcion_publica?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          nombre_publico: string
          participante_id?: string | null
          portada_url?: string | null
          sede_id: string
          slug: string
          updated_at?: string
          visible?: boolean
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          descripcion_publica?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          nombre_publico?: string
          participante_id?: string | null
          portada_url?: string | null
          sede_id?: string
          slug?: string
          updated_at?: string
          visible?: boolean
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_configuracion_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_configuracion_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: true
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_productos: {
        Row: {
          aurum_render_url: string | null
          categoria: string
          codigo: string
          created_at: string
          descripcion: string | null
          destacado: boolean
          galeria: Json
          id: string
          imagen_principal_url: string | null
          metadata: Json
          moneda: string
          nombre: string
          orden: number
          participante_id: string | null
          precio_desde: number | null
          publicado: boolean
          sede_id: string
          slug: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          aurum_render_url?: string | null
          categoria?: string
          codigo: string
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          galeria?: Json
          id?: string
          imagen_principal_url?: string | null
          metadata?: Json
          moneda?: string
          nombre: string
          orden?: number
          participante_id?: string | null
          precio_desde?: number | null
          publicado?: boolean
          sede_id: string
          slug: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          aurum_render_url?: string | null
          categoria?: string
          codigo?: string
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          galeria?: Json
          id?: string
          imagen_principal_url?: string | null
          metadata?: Json
          moneda?: string
          nombre?: string
          orden?: number
          participante_id?: string | null
          precio_desde?: number | null
          publicado?: boolean
          sede_id?: string
          slug?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_productos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_productos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_productos_colecciones: {
        Row: {
          coleccion_id: string
          created_at: string
          producto_id: string
        }
        Insert: {
          coleccion_id: string
          created_at?: string
          producto_id: string
        }
        Update: {
          coleccion_id?: string
          created_at?: string
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_productos_colecciones_coleccion_id_fkey"
            columns: ["coleccion_id"]
            isOneToOne: false
            referencedRelation: "catalogo_colecciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_productos_colecciones_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_productos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ciudad: string | null
          creado_por: string | null
          created_at: string
          direccion: string | null
          documento: string | null
          email: string | null
          estado: string
          id: string
          metadata: Json
          nombre: string
          notas: string
          participante_id: string | null
          sede_id: string | null
          telefono: string | null
          tipo: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ciudad?: string | null
          creado_por?: string | null
          created_at?: string
          direccion?: string | null
          documento?: string | null
          email?: string | null
          estado?: string
          id?: string
          metadata?: Json
          nombre: string
          notas?: string
          participante_id?: string | null
          sede_id?: string | null
          telefono?: string | null
          tipo?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ciudad?: string | null
          creado_por?: string | null
          created_at?: string
          direccion?: string | null
          documento?: string | null
          email?: string | null
          estado?: string
          id?: string
          metadata?: Json
          nombre?: string
          notas?: string
          participante_id?: string | null
          sede_id?: string | null
          telefono?: string | null
          tipo?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      compra_detalles: {
        Row: {
          cantidad: number
          cantidad_recibida: number
          compra_id: string
          costo_unitario: number
          created_at: string
          descripcion: string
          id: string
          impuesto: number
          material_id: string
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad: number
          cantidad_recibida?: number
          compra_id: string
          costo_unitario: number
          created_at?: string
          descripcion?: string
          id?: string
          impuesto?: number
          material_id: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          cantidad_recibida?: number
          compra_id?: string
          costo_unitario?: number
          created_at?: string
          descripcion?: string
          id?: string
          impuesto?: number
          material_id?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compra_detalles_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compra_detalles_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          creado_por: string | null
          created_at: string
          estado: string
          fecha_emision: string
          fecha_entrega: string | null
          id: string
          impuestos: number
          moneda: string
          notas: string
          numero: string
          participante_id: string | null
          proveedor_nombre: string
          proveedor_participante_id: string | null
          sede_id: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          estado?: string
          fecha_emision?: string
          fecha_entrega?: string | null
          id?: string
          impuestos?: number
          moneda?: string
          notas?: string
          numero: string
          participante_id?: string | null
          proveedor_nombre?: string
          proveedor_participante_id?: string | null
          sede_id: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          estado?: string
          fecha_emision?: string
          fecha_entrega?: string | null
          id?: string
          impuestos?: number
          moneda?: string
          notas?: string
          numero?: string
          participante_id?: string | null
          proveedor_nombre?: string
          proveedor_participante_id?: string | null
          sede_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      config_areas: {
        Row: {
          alerta_activa: boolean
          area: string
          created_at: string
          horas_objetivo: number
          id: string
          participante_id: string | null
          sede_id: string | null
          updated_at: string
        }
        Insert: {
          alerta_activa?: boolean
          area: string
          created_at?: string
          horas_objetivo?: number
          id?: string
          participante_id?: string | null
          sede_id?: string | null
          updated_at?: string
        }
        Update: {
          alerta_activa?: boolean
          area?: string
          created_at?: string
          horas_objetivo?: number
          id?: string
          participante_id?: string | null
          sede_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_areas_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
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
      contrato_documentos: {
        Row: {
          contrato_id: string
          creado_por: string | null
          created_at: string
          id: string
          plantilla_contenido: Json
          plantilla_version: number | null
          sha256: string
          storage_path: string
          tipo: string
          version: number
        }
        Insert: {
          contrato_id: string
          creado_por?: string | null
          created_at?: string
          id?: string
          plantilla_contenido?: Json
          plantilla_version?: number | null
          sha256: string
          storage_path: string
          tipo?: string
          version?: number
        }
        Update: {
          contrato_id?: string
          creado_por?: string | null
          created_at?: string
          id?: string
          plantilla_contenido?: Json
          plantilla_version?: number | null
          sha256?: string
          storage_path?: string
          tipo?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_documentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_pagos: {
        Row: {
          concepto: string
          contrato_id: string
          contrato_numero: string
          created_at: string
          fecha: string
          id: string
          monto: number
          usuario_id: string | null
        }
        Insert: {
          concepto?: string
          contrato_id: string
          contrato_numero?: string
          created_at?: string
          fecha?: string
          id?: string
          monto: number
          usuario_id?: string | null
        }
        Update: {
          concepto?: string
          contrato_id?: string
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
          participante_id: string | null
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
          participante_id?: string | null
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
          participante_id?: string | null
          sede_id?: string | null
          telefono?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      control_calidad: {
        Row: {
          created_at: string
          descripcion: string
          evidencia_url: string | null
          id: string
          inspeccionado_por: string
          motivo: string
          orden_produccion_id: string
          resultado: string
          retrabajo_trabajo_id: string | null
          tipo: string
          trabajo_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string
          evidencia_url?: string | null
          id?: string
          inspeccionado_por: string
          motivo?: string
          orden_produccion_id: string
          resultado?: string
          retrabajo_trabajo_id?: string | null
          tipo?: string
          trabajo_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string
          evidencia_url?: string | null
          id?: string
          inspeccionado_por?: string
          motivo?: string
          orden_produccion_id?: string
          resultado?: string
          retrabajo_trabajo_id?: string | null
          tipo?: string
          trabajo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_calidad_orden_produccion_id_fkey"
            columns: ["orden_produccion_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_calidad_retrabajo_trabajo_id_fkey"
            columns: ["retrabajo_trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_calidad_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos"
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
          metadata: Json
          orden: number
          precio_unitario: number
          tipo: string
          total_costo: number
          total_precio: number
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          costo_unitario?: number
          cotizacion_id: string
          created_at?: string
          descripcion: string
          id?: string
          metadata?: Json
          orden?: number
          precio_unitario?: number
          tipo?: string
          total_costo?: number
          total_precio?: number
          unidad?: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          cotizacion_id?: string
          created_at?: string
          descripcion?: string
          id?: string
          metadata?: Json
          orden?: number
          precio_unitario?: number
          tipo?: string
          total_costo?: number
          total_precio?: number
          unidad?: string
          updated_at?: string
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
      cotizacion_documentos_publicos: {
        Row: {
          cotizacion_id: string
          creado_por: string | null
          created_at: string
          id: string
          public_url: string
          storage_path: string
          version: number
        }
        Insert: {
          cotizacion_id: string
          creado_por?: string | null
          created_at?: string
          id?: string
          public_url: string
          storage_path: string
          version: number
        }
        Update: {
          cotizacion_id?: string
          creado_por?: string | null
          created_at?: string
          id?: string
          public_url?: string
          storage_path?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_documentos_publicos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_numeradores: {
        Row: {
          anio: number
          participante_id: string | null
          sede_id: string
          ultimo_numero: number
        }
        Insert: {
          anio: number
          participante_id?: string | null
          sede_id: string
          ultimo_numero?: number
        }
        Update: {
          anio?: number
          participante_id?: string | null
          sede_id?: string
          ultimo_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_numeradores_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizacion_numeradores_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          anticipo: number
          cliente_id: string
          creado_por: string | null
          created_at: string
          descuento: number
          estado: string
          fecha_emision: string
          fecha_entrega_solicitada: string | null
          fecha_vencimiento: string | null
          id: string
          identidad_comercial: Json
          identidad_comercial_id: string | null
          impuestos: number
          moneda: string
          notas_cliente: string
          notas_internas: string
          numero: string
          participante_id: string | null
          proyecto_joya_id: string | null
          reemplaza_id: string | null
          sede_id: string | null
          subtotal: number
          subtotal_costo: number
          total: number
          updated_at: string
          version: number
        }
        Insert: {
          anticipo?: number
          cliente_id: string
          creado_por?: string | null
          created_at?: string
          descuento?: number
          estado?: string
          fecha_emision?: string
          fecha_entrega_solicitada?: string | null
          fecha_vencimiento?: string | null
          id?: string
          identidad_comercial?: Json
          identidad_comercial_id?: string | null
          impuestos?: number
          moneda?: string
          notas_cliente?: string
          notas_internas?: string
          numero: string
          participante_id?: string | null
          proyecto_joya_id?: string | null
          reemplaza_id?: string | null
          sede_id?: string | null
          subtotal?: number
          subtotal_costo?: number
          total?: number
          updated_at?: string
          version?: number
        }
        Update: {
          anticipo?: number
          cliente_id?: string
          creado_por?: string | null
          created_at?: string
          descuento?: number
          estado?: string
          fecha_emision?: string
          fecha_entrega_solicitada?: string | null
          fecha_vencimiento?: string | null
          id?: string
          identidad_comercial?: Json
          identidad_comercial_id?: string | null
          impuestos?: number
          moneda?: string
          notas_cliente?: string
          notas_internas?: string
          numero?: string
          participante_id?: string | null
          proyecto_joya_id?: string | null
          reemplaza_id?: string | null
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
            foreignKeyName: "cotizaciones_identidad_comercial_id_fkey"
            columns: ["identidad_comercial_id"]
            isOneToOne: false
            referencedRelation: "identidades_comerciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
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
            foreignKeyName: "cotizaciones_reemplaza_id_fkey"
            columns: ["reemplaza_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
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
          metadata: Json
          nombre: string
          notas_owner: string | null
          razon_social: string | null
          sede_id: string | null
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
          metadata?: Json
          nombre: string
          notas_owner?: string | null
          razon_social?: string | null
          sede_id?: string | null
          telefono?: string | null
          tipo_participante: string
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          created_at?: string
          descripcion?: string | null
          email?: string | null
          estado?: string
          id?: string
          metadata?: Json
          nombre?: string
          notas_owner?: string | null
          razon_social?: string | null
          sede_id?: string | null
          telefono?: string | null
          tipo_participante?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosistema_participantes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      especialidades: {
        Row: {
          activa: boolean
          categoria: string | null
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          nombre?: string
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
          participante_id: string | null
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
          participante_id?: string | null
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
          participante_id?: string | null
          sede_id?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      identidades_comerciales: {
        Row: {
          activa: boolean
          ciudad: string | null
          color_principal: string | null
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          logo_url: string | null
          metadata: Json
          nombre_comercial: string
          participante_id: string | null
          pie_documento: string | null
          razon_social: string | null
          ruc: string | null
          sede_id: string | null
          sitio_web: string | null
          telefono: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          activa?: boolean
          ciudad?: string | null
          color_principal?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json
          nombre_comercial: string
          participante_id?: string | null
          pie_documento?: string | null
          razon_social?: string | null
          ruc?: string | null
          sede_id?: string | null
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          activa?: boolean
          ciudad?: string | null
          color_principal?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          metadata?: Json
          nombre_comercial?: string
          participante_id?: string | null
          pie_documento?: string | null
          razon_social?: string | null
          ruc?: string | null
          sede_id?: string | null
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identidades_comerciales_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identidades_comerciales_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      incidencias_trabajo: {
        Row: {
          created_at: string
          descripcion: string
          estado: string
          id: string
          reportado_por: string | null
          resolucion: string | null
          resuelto_at: string | null
          resuelto_por: string | null
          tipo: string
          trabajo_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          reportado_por?: string | null
          resolucion?: string | null
          resuelto_at?: string | null
          resuelto_por?: string | null
          tipo?: string
          trabajo_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          reportado_por?: string | null
          resolucion?: string | null
          resuelto_at?: string | null
          resuelto_por?: string | null
          tipo?: string
          trabajo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidencias_trabajo_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario: {
        Row: {
          activo: boolean
          categoria: string
          codigo: string
          costo_unitario: number
          created_at: string
          id: string
          lote: string
          material: string
          minimo: number
          participante_id: string | null
          proveedor: string
          sede_id: string | null
          stock: number
          ubicacion: string
          unidad: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria?: string
          codigo?: string
          costo_unitario?: number
          created_at?: string
          id?: string
          lote?: string
          material: string
          minimo?: number
          participante_id?: string | null
          proveedor?: string
          sede_id?: string | null
          stock?: number
          ubicacion?: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria?: string
          codigo?: string
          costo_unitario?: number
          created_at?: string
          id?: string
          lote?: string
          material?: string
          minimo?: number
          participante_id?: string | null
          proveedor?: string
          sede_id?: string | null
          stock?: number
          ubicacion?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_joya_eventos: {
        Row: {
          created_at: string
          estado_anterior: string | null
          estado_nuevo: string | null
          id: string
          joya_id: string
          nota: string | null
          participante_id: string | null
          sede_id: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: string
          joya_id: string
          nota?: string | null
          participante_id?: string | null
          sede_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: string
          joya_id?: string
          nota?: string | null
          participante_id?: string | null
          sede_id?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_joya_eventos_joya_id_fkey"
            columns: ["joya_id"]
            isOneToOne: false
            referencedRelation: "inventario_joyas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_joya_eventos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_joyas: {
        Row: {
          cantidad: number
          codigo: string
          created_at: string
          estado: string
          id: string
          importacion_id: string | null
          ley: string
          metadata: Json
          metal: string
          nombre: string
          origen: string
          participante_id: string | null
          peso: number | null
          piedras: string
          sede_id: string
          talla: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          codigo: string
          created_at?: string
          estado?: string
          id?: string
          importacion_id?: string | null
          ley?: string
          metadata?: Json
          metal?: string
          nombre: string
          origen?: string
          participante_id?: string | null
          peso?: number | null
          piedras?: string
          sede_id: string
          talla?: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          codigo?: string
          created_at?: string
          estado?: string
          id?: string
          importacion_id?: string | null
          ley?: string
          metadata?: Json
          metal?: string
          nombre?: string
          origen?: string
          participante_id?: string | null
          peso?: number | null
          piedras?: string
          sede_id?: string
          talla?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_joyas_importacion_id_fkey"
            columns: ["importacion_id"]
            isOneToOne: false
            referencedRelation: "inventario_joyas_importaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_joyas_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_joyas_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_joyas_importaciones: {
        Row: {
          creado_por: string | null
          created_at: string
          filas_con_revision: number
          filas_detectadas: number
          filas_importadas: number
          id: string
          nombre_archivo: string
          participante_id: string | null
          sede_id: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          filas_con_revision?: number
          filas_detectadas?: number
          filas_importadas?: number
          id?: string
          nombre_archivo: string
          participante_id?: string | null
          sede_id: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          filas_con_revision?: number
          filas_detectadas?: number
          filas_importadas?: number
          id?: string
          nombre_archivo?: string
          participante_id?: string | null
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_joyas_importaciones_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_joyas_importaciones_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_movimientos: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          material_id: string
          motivo: string
          pedido_id: string | null
          referencia_externa: string
          stock_anterior: number | null
          stock_posterior: number | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          material_id: string
          motivo?: string
          pedido_id?: string | null
          referencia_externa?: string
          stock_anterior?: number | null
          stock_posterior?: number | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          material_id?: string
          motivo?: string
          pedido_id?: string | null
          referencia_externa?: string
          stock_anterior?: number | null
          stock_posterior?: number | null
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
          {
            foreignKeyName: "inventario_movimientos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
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
      orden_produccion_costos: {
        Row: {
          cantidad: number
          categoria: string
          concepto: string
          costo_unitario: number
          created_at: string
          id: string
          importe: number
          moneda: string
          orden_produccion_id: string
          origen: string
          referencia_id: string | null
          unidad: string
        }
        Insert: {
          cantidad?: number
          categoria: string
          concepto: string
          costo_unitario?: number
          created_at?: string
          id?: string
          importe?: number
          moneda?: string
          orden_produccion_id: string
          origen?: string
          referencia_id?: string | null
          unidad?: string
        }
        Update: {
          cantidad?: number
          categoria?: string
          concepto?: string
          costo_unitario?: number
          created_at?: string
          id?: string
          importe?: number
          moneda?: string
          orden_produccion_id?: string
          origen?: string
          referencia_id?: string | null
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "orden_produccion_costos_orden_produccion_id_fkey"
            columns: ["orden_produccion_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_produccion_entregas: {
        Row: {
          area_destino: string
          cantidad: number
          created_at: string
          entregado_por: string | null
          id: string
          material_id: string
          notas: string
          orden_produccion_id: string
          recibido_por: string | null
          unidad: string
        }
        Insert: {
          area_destino?: string
          cantidad: number
          created_at?: string
          entregado_por?: string | null
          id?: string
          material_id: string
          notas?: string
          orden_produccion_id: string
          recibido_por?: string | null
          unidad?: string
        }
        Update: {
          area_destino?: string
          cantidad?: number
          created_at?: string
          entregado_por?: string | null
          id?: string
          material_id?: string
          notas?: string
          orden_produccion_id?: string
          recibido_por?: string | null
          unidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "orden_produccion_entregas_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_produccion_entregas_orden_produccion_id_fkey"
            columns: ["orden_produccion_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_produccion_resumen_costos: {
        Row: {
          calculado_at: string
          calculado_por: string | null
          costo_ajustes: number
          costo_estimado: number
          costo_externo: number
          costo_indirecto: number
          costo_mano_obra: number
          costo_materiales: number
          costo_real: number
          created_at: string
          id: string
          margen: number
          margen_porcentaje: number | null
          moneda: string
          orden_produccion_id: string
          updated_at: string
          venta: number
        }
        Insert: {
          calculado_at?: string
          calculado_por?: string | null
          costo_ajustes?: number
          costo_estimado?: number
          costo_externo?: number
          costo_indirecto?: number
          costo_mano_obra?: number
          costo_materiales?: number
          costo_real?: number
          created_at?: string
          id?: string
          margen?: number
          margen_porcentaje?: number | null
          moneda?: string
          orden_produccion_id: string
          updated_at?: string
          venta?: number
        }
        Update: {
          calculado_at?: string
          calculado_por?: string | null
          costo_ajustes?: number
          costo_estimado?: number
          costo_externo?: number
          costo_indirecto?: number
          costo_mano_obra?: number
          costo_materiales?: number
          costo_real?: number
          created_at?: string
          id?: string
          margen?: number
          margen_porcentaje?: number | null
          moneda?: string
          orden_produccion_id?: string
          updated_at?: string
          venta?: number
        }
        Relationships: [
          {
            foreignKeyName: "orden_produccion_resumen_costos_orden_produccion_id_fkey"
            columns: ["orden_produccion_id"]
            isOneToOne: true
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_produccion: {
        Row: {
          creado_por: string | null
          created_at: string
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_planificada_fin: string | null
          fecha_planificada_inicio: string | null
          id: string
          notas: string
          numero: string
          participante_id: string | null
          pedido_id: string
          prioridad: string
          responsable_user_id: string | null
          sede_id: string | null
          updated_at: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_planificada_fin?: string | null
          fecha_planificada_inicio?: string | null
          id?: string
          notas?: string
          numero: string
          participante_id?: string | null
          pedido_id: string
          prioridad?: string
          responsable_user_id?: string | null
          sede_id?: string | null
          updated_at?: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_planificada_fin?: string | null
          fecha_planificada_inicio?: string | null
          id?: string
          notas?: string
          numero?: string
          participante_id?: string | null
          pedido_id?: string
          prioridad?: string
          responsable_user_id?: string | null
          sede_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_produccion_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_produccion_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
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
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          participante_id: string
          relacion?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          participante_id?: string
          relacion?: string
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
          participante_id: string
        }
        Insert: {
          created_at?: string
          especialidad_id: string
          participante_id: string
        }
        Update: {
          created_at?: string
          especialidad_id?: string
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
      pedido_comercial: {
        Row: {
          a_cuenta: number
          cotizacion_detalles: Json
          created_at: string
          entregado_at: string | null
          enviado_at: string | null
          especificaciones_comerciales: Json
          fecha_entregado: string | null
          fecha_envio: string | null
          fecha_listo_entrega: string | null
          guia_envio: string | null
          importe: number
          listo_entrega_observaciones: string | null
          medio_envio: string | null
          notas_entrega: string | null
          notas_envio: string | null
          notas_ventas: string | null
          packing_estado: string | null
          pedido_id: string
          receptor_envio: string | null
          saldo: number
          telefono: string
          updated_at: string
          usuario_entrega: string | null
          usuario_envio: string | null
          usuario_listo_entrega: string | null
          ventas_actualizado_en: string | null
          ventas_actualizado_por: string | null
          ventas_estado: string | null
        }
        Insert: {
          a_cuenta?: number
          cotizacion_detalles?: Json
          created_at?: string
          entregado_at?: string | null
          enviado_at?: string | null
          especificaciones_comerciales?: Json
          fecha_entregado?: string | null
          fecha_envio?: string | null
          fecha_listo_entrega?: string | null
          guia_envio?: string | null
          importe?: number
          listo_entrega_observaciones?: string | null
          medio_envio?: string | null
          notas_entrega?: string | null
          notas_envio?: string | null
          notas_ventas?: string | null
          packing_estado?: string | null
          pedido_id: string
          receptor_envio?: string | null
          saldo?: number
          telefono?: string
          updated_at?: string
          usuario_entrega?: string | null
          usuario_envio?: string | null
          usuario_listo_entrega?: string | null
          ventas_actualizado_en?: string | null
          ventas_actualizado_por?: string | null
          ventas_estado?: string | null
        }
        Update: {
          a_cuenta?: number
          cotizacion_detalles?: Json
          created_at?: string
          entregado_at?: string | null
          enviado_at?: string | null
          especificaciones_comerciales?: Json
          fecha_entregado?: string | null
          fecha_envio?: string | null
          fecha_listo_entrega?: string | null
          guia_envio?: string | null
          importe?: number
          listo_entrega_observaciones?: string | null
          medio_envio?: string | null
          notas_entrega?: string | null
          notas_envio?: string | null
          notas_ventas?: string | null
          packing_estado?: string | null
          pedido_id?: string
          receptor_envio?: string | null
          saldo?: number
          telefono?: string
          updated_at?: string
          usuario_entrega?: string | null
          usuario_envio?: string | null
          usuario_listo_entrega?: string | null
          ventas_actualizado_en?: string | null
          ventas_actualizado_por?: string | null
          ventas_estado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_comercial_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_entrega_eventos: {
        Row: {
          created_at: string
          datos: Json
          id: string
          participante_id: string | null
          pedido_id: string
          sede_id: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          datos?: Json
          id?: string
          participante_id?: string | null
          pedido_id: string
          sede_id: string
          tipo: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          datos?: Json
          id?: string
          participante_id?: string | null
          pedido_id?: string
          sede_id?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_entrega_eventos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_entrega_eventos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_entrega_eventos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_materiales: {
        Row: {
          cantidad_planificada: number
          created_at: string
          id: string
          material_id: string
          notas: string
          pedido_id: string
          unidad: string
          updated_at: string
        }
        Insert: {
          cantidad_planificada: number
          created_at?: string
          id?: string
          material_id: string
          notas?: string
          pedido_id: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          cantidad_planificada?: number
          created_at?: string
          id?: string
          material_id?: string
          notas?: string
          pedido_id?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_materiales_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_materiales_pedido_id_fkey"
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
          a_cuenta: number
          area_actual: string
          area_desde: string
          cantidad_piezas: number
          cliente: string
          contrato: string
          contrato_id: string | null
          cotizacion_detalles: Json
          cotizacion_id: string | null
          created_at: string
          entrega: string
          entregado_at: string | null
          enviado_at: string | null
          especificaciones_comerciales: Json
          estado: string
          evidencia_entrega_url: string | null
          fecha_entrega: string | null
          fecha_entregado: string | null
          fecha_envio: string | null
          fecha_ingreso: string
          fecha_listo_entrega: string | null
          guia_envio: string
          id: string
          importe: number
          listo_entrega_observaciones: string
          material: string
          medio_envio: string
          notas: string
          notas_entrega: string
          notas_envio: string
          notas_ventas: string
          origen: string
          origen_comercial: string
          packing_estado: string
          packing_preparado_at: string | null
          packing_preparado_por: string | null
          participante_id: string | null
          peso_estimado: string
          piedras: string
          pieza: string
          proyecto_joya_id: string | null
          receptor_envio: string
          referencia: string
          ruta: string[]
          saldo: number
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
          a_cuenta?: number
          area_actual?: string
          area_desde?: string
          cantidad_piezas?: number
          cliente: string
          contrato?: string
          contrato_id?: string | null
          cotizacion_detalles?: Json
          cotizacion_id?: string | null
          created_at?: string
          entrega?: string
          entregado_at?: string | null
          enviado_at?: string | null
          especificaciones_comerciales?: Json
          estado?: string
          evidencia_entrega_url?: string | null
          fecha_entrega?: string | null
          fecha_entregado?: string | null
          fecha_envio?: string | null
          fecha_ingreso?: string
          fecha_listo_entrega?: string | null
          guia_envio?: string
          id?: string
          importe?: number
          listo_entrega_observaciones?: string
          material: string
          medio_envio?: string
          notas?: string
          notas_entrega?: string
          notas_envio?: string
          notas_ventas?: string
          origen?: string
          origen_comercial?: string
          packing_estado?: string
          packing_preparado_at?: string | null
          packing_preparado_por?: string | null
          participante_id?: string | null
          peso_estimado?: string
          piedras?: string
          pieza: string
          proyecto_joya_id?: string | null
          receptor_envio?: string
          referencia: string
          ruta?: string[]
          saldo?: number
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
          a_cuenta?: number
          area_actual?: string
          area_desde?: string
          cantidad_piezas?: number
          cliente?: string
          contrato?: string
          contrato_id?: string | null
          cotizacion_detalles?: Json
          cotizacion_id?: string | null
          created_at?: string
          entrega?: string
          entregado_at?: string | null
          enviado_at?: string | null
          especificaciones_comerciales?: Json
          estado?: string
          evidencia_entrega_url?: string | null
          fecha_entrega?: string | null
          fecha_entregado?: string | null
          fecha_envio?: string | null
          fecha_ingreso?: string
          fecha_listo_entrega?: string | null
          guia_envio?: string
          id?: string
          importe?: number
          listo_entrega_observaciones?: string
          material?: string
          medio_envio?: string
          notas?: string
          notas_entrega?: string
          notas_envio?: string
          notas_ventas?: string
          origen?: string
          origen_comercial?: string
          packing_estado?: string
          packing_preparado_at?: string | null
          packing_preparado_por?: string | null
          participante_id?: string | null
          peso_estimado?: string
          piedras?: string
          pieza?: string
          proyecto_joya_id?: string | null
          receptor_envio?: string
          referencia?: string
          ruta?: string[]
          saldo?: number
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
            foreignKeyName: "pedidos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
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
      piezas_terminadas: {
        Row: {
          cantidad: number
          created_at: string
          estado: string
          id: string
          metal_estimado: string
          metal_real: string
          numero_pieza: string
          observaciones: string
          orden_produccion_id: string
          pedido_id: string
          peso_estimado: number | null
          peso_final: number | null
          piedras_estimadas: string
          piedras_reales: string
          registrado_por: string | null
          unidad_peso: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          estado?: string
          id?: string
          metal_estimado?: string
          metal_real?: string
          numero_pieza: string
          observaciones?: string
          orden_produccion_id: string
          pedido_id: string
          peso_estimado?: number | null
          peso_final?: number | null
          piedras_estimadas?: string
          piedras_reales?: string
          registrado_por?: string | null
          unidad_peso?: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          estado?: string
          id?: string
          metal_estimado?: string
          metal_real?: string
          numero_pieza?: string
          observaciones?: string
          orden_produccion_id?: string
          pedido_id?: string
          peso_estimado?: number | null
          peso_final?: number | null
          piedras_estimadas?: string
          piedras_reales?: string
          registrado_por?: string | null
          unidad_peso?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "piezas_terminadas_orden_produccion_id_fkey"
            columns: ["orden_produccion_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piezas_terminadas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_contrato: {
        Row: {
          activa: boolean
          contenido: Json
          created_at: string
          id: string
          identidad_comercial_id: string
          nombre: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          activa?: boolean
          contenido?: Json
          created_at?: string
          id?: string
          identidad_comercial_id: string
          nombre?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          activa?: boolean
          contenido?: Json
          created_at?: string
          id?: string
          identidad_comercial_id?: string
          nombre?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_contrato_identidad_comercial_id_fkey"
            columns: ["identidad_comercial_id"]
            isOneToOne: true
            referencedRelation: "identidades_comerciales"
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
          participante_id: string | null
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
          participante_id?: string | null
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
          participante_id?: string | null
          pieza?: string
          progreso?: number
          referencia?: string
          sede_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procesos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procesos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      produccion_eventos: {
        Row: {
          created_at: string
          datos: Json
          estado_anterior: string | null
          estado_nuevo: string | null
          id: string
          orden_produccion_id: string | null
          participante_id: string | null
          pedido_id: string | null
          sede_id: string | null
          tipo: string
          trabajo_id: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          datos?: Json
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: string
          orden_produccion_id?: string | null
          participante_id?: string | null
          pedido_id?: string | null
          sede_id?: string | null
          tipo: string
          trabajo_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          datos?: Json
          estado_anterior?: string | null
          estado_nuevo?: string | null
          id?: string
          orden_produccion_id?: string | null
          participante_id?: string | null
          pedido_id?: string | null
          sede_id?: string | null
          tipo?: string
          trabajo_id?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produccion_eventos_orden_produccion_id_fkey"
            columns: ["orden_produccion_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produccion_eventos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produccion_eventos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produccion_eventos_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acceso_desde: string | null
          acceso_hasta: string | null
          activo: boolean
          apellidos: string
          clave_visible: string | null
          created_at: string
          dni: string
          id: string
          nombre: string
          participante_id: string | null
          sede_id: string | null
          telefono: string
          updated_at: string
          usuario: string
        }
        Insert: {
          acceso_desde?: string | null
          acceso_hasta?: string | null
          activo?: boolean
          apellidos?: string
          clave_visible?: string | null
          created_at?: string
          dni?: string
          id: string
          nombre?: string
          participante_id?: string | null
          sede_id?: string | null
          telefono?: string
          updated_at?: string
          usuario: string
        }
        Update: {
          acceso_desde?: string | null
          acceso_hasta?: string | null
          activo?: boolean
          apellidos?: string
          clave_visible?: string | null
          created_at?: string
          dni?: string
          id?: string
          nombre?: string
          participante_id?: string | null
          sede_id?: string | null
          telefono?: string
          updated_at?: string
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
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
          cantidad_piezas: number
          cliente_id: string
          codigo: string
          creado_por: string | null
          created_at: string
          descripcion: string
          especificaciones: Json
          estado: string
          id: string
          ley: string | null
          metadata: Json
          metal: string | null
          nombre: string
          participante_id: string | null
          peso_estimado: number | null
          piedras: string | null
          sede_id: string | null
          talla: string | null
          updated_at: string
        }
        Insert: {
          cantidad_piezas?: number
          cliente_id: string
          codigo: string
          creado_por?: string | null
          created_at?: string
          descripcion?: string
          especificaciones?: Json
          estado?: string
          id?: string
          ley?: string | null
          metadata?: Json
          metal?: string | null
          nombre: string
          participante_id?: string | null
          peso_estimado?: number | null
          piedras?: string | null
          sede_id?: string | null
          talla?: string | null
          updated_at?: string
        }
        Update: {
          cantidad_piezas?: number
          cliente_id?: string
          codigo?: string
          creado_por?: string | null
          created_at?: string
          descripcion?: string
          especificaciones?: Json
          estado?: string
          id?: string
          ley?: string | null
          metadata?: Json
          metal?: string | null
          nombre?: string
          participante_id?: string | null
          peso_estimado?: number | null
          piedras?: string | null
          sede_id?: string | null
          talla?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_joya_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_joya_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_joya_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
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
      sede_especialidades: {
        Row: {
          created_at: string
          especialidad_id: string
          sede_id: string
        }
        Insert: {
          created_at?: string
          especialidad_id: string
          sede_id: string
        }
        Update: {
          created_at?: string
          especialidad_id?: string
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sede_especialidades_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sede_especialidades_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
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
          participante_id: string | null
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
          participante_id?: string | null
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
          participante_id?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          telefono?: string | null
          tipo_solicitante?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_acceso_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_taller: {
        Row: {
          banco: string
          created_at: string
          estado: string
          id: string
          participante_id: string | null
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
          participante_id?: string | null
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
          participante_id?: string | null
          responsable?: string
          sede_id?: string | null
          tarea?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_taller_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_taller_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas_mano_obra: {
        Row: {
          activo: boolean
          area: string
          created_at: string
          id: string
          moneda: string
          notas: string
          participante_id: string | null
          sede_id: string | null
          tarifa_hora: number
          usuario_id: string | null
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          activo?: boolean
          area?: string
          created_at?: string
          id?: string
          moneda?: string
          notas?: string
          participante_id?: string | null
          sede_id?: string | null
          tarifa_hora: number
          usuario_id?: string | null
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Update: {
          activo?: boolean
          area?: string
          created_at?: string
          id?: string
          moneda?: string
          notas?: string
          participante_id?: string | null
          sede_id?: string | null
          tarifa_hora?: number
          usuario_id?: string | null
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_mano_obra_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarifas_mano_obra_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajo_archivos: {
        Row: {
          created_at: string
          id: string
          pedido_archivo_id: string
          trabajo_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_archivo_id: string
          trabajo_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pedido_archivo_id?: string
          trabajo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajo_archivos_pedido_archivo_id_fkey"
            columns: ["pedido_archivo_id"]
            isOneToOne: false
            referencedRelation: "pedido_archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajo_archivos_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajo_tiempos: {
        Row: {
          created_at: string
          fin: string | null
          id: string
          inicio: string
          motivo_pausa: string
          segundos_acumulados: number
          trabajo_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          fin?: string | null
          id?: string
          inicio?: string
          motivo_pausa?: string
          segundos_acumulados?: number
          trabajo_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          fin?: string | null
          id?: string
          inicio?: string
          motivo_pausa?: string
          segundos_acumulados?: number
          trabajo_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajo_tiempos_trabajo_id_fkey"
            columns: ["trabajo_id"]
            isOneToOne: false
            referencedRelation: "trabajos"
            referencedColumns: ["id"]
          },
        ]
      }
      trabajos: {
        Row: {
          area: string
          created_at: string
          descripcion: string
          especialidad_id: string | null
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_planificada: string | null
          id: string
          notas: string
          orden_produccion_id: string | null
          participante_id: string | null
          pedido_id: string
          prioridad: string
          responsable_user_id: string | null
          secuencia: number
          sede_id: string | null
          tipo: string
          titulo: string
          ubicacion: string
          updated_at: string
        }
        Insert: {
          area?: string
          created_at?: string
          descripcion?: string
          especialidad_id?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_planificada?: string | null
          id?: string
          notas?: string
          orden_produccion_id?: string | null
          participante_id?: string | null
          pedido_id: string
          prioridad?: string
          responsable_user_id?: string | null
          secuencia?: number
          sede_id?: string | null
          tipo?: string
          titulo?: string
          ubicacion?: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          descripcion?: string
          especialidad_id?: string | null
          estado?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_planificada?: string | null
          id?: string
          notas?: string
          orden_produccion_id?: string | null
          participante_id?: string | null
          pedido_id?: string
          prioridad?: string
          responsable_user_id?: string | null
          secuencia?: number
          sede_id?: string | null
          tipo?: string
          titulo?: string
          ubicacion?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trabajos_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_orden_produccion_id_fkey"
            columns: ["orden_produccion_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trabajos_sede_id_fkey"
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
          participante_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          sede_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          participante_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          sede_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          participante_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          sede_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
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
      asignar_participante_externo_trabajo: {
        Args: { _participante_id: string; _trabajo_id: string }
        Returns: Json
      }
      asignar_responsable_trabajo: {
        Args: { _responsable_user_id: string; _trabajo_id: string }
        Returns: Json
      }
      cambiar_estado_trabajo: {
        Args: { _nuevo_estado: string; _trabajo_id: string }
        Returns: undefined
      }
      codigo_taller_cotizacion: { Args: { _sede_id: string }; Returns: string }
      crear_cotizacion_comercial: {
        Args: {
          _cantidad: number
          _cliente_email: string
          _cliente_id: string
          _cliente_nombre: string
          _cliente_telefono: string
          _costo_unitario: number
          _descripcion: string
          _descuento: number
          _fecha_entrega_solicitada: string
          _fecha_vencimiento: string
          _impuestos: number
          _moneda: string
          _notas_cliente: string
          _notas_internas: string
          _precio_unitario: number
          _proyecto_joya_id: string
          _sede_id: string
        }
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
      listar_operarios_por_area: {
        Args: { _sede_id: string }
        Returns: {
          areas: string[]
          id: string
          nombre: string
        }[]
      }
      listar_participantes_servicio:
        | {
            Args: { _area?: string }
            Returns: {
              especialidad: string
              id: string
              nombre: string
              tipo_participante: string
            }[]
          }
        | {
            Args: { _area: string; _especialidad_id: string }
            Returns: {
              especialidad: string
              id: string
              nombre: string
              tipo_participante: string
            }[]
          }
      listar_trabajos_operario: {
        Args: never
        Returns: {
          area: string
          descripcion: string
          estado: string
          fecha_fin: string
          fecha_inicio: string
          fecha_planificada: string
          id: string
          notas: string
          pedido_id: string
          prioridad: string
          responsable_user_id: string
          tipo: string
          titulo: string
          ubicacion: string
        }[]
      }
      mi_participante: { Args: { _user_id: string }; Returns: string }
      mi_sede: { Args: { _user_id: string }; Returns: string }
      obtener_catalogo_publico: {
        Args: { _slug: string }
        Returns: {
          aurum_render_url: string
          categoria: string
          codigo: string
          descripcion: string
          descripcion_publica: string
          destacado: boolean
          galeria: Json
          imagen_principal_url: string
          instagram_url: string
          logo_url: string
          moneda: string
          nombre: string
          nombre_publico: string
          portada_url: string
          precio_desde: number
          producto_id: string
          sede_id: string
          slug: string
          video_url: string
          whatsapp: string
        }[]
      }
      preparar_produccion_pedido: {
        Args: { _pedido_id: string }
        Returns: Json
      }
      recalcular_abonado_contrato: {
        Args: { _contrato_id: string }
        Returns: undefined
      }
      recibir_compra: { Args: { _compra_id: string }; Returns: Json }
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
      siguiente_numero_cotizacion: {
        Args: { _anio: number; _sede_id: string }
        Returns: string
      }
      tiene_participante: {
        Args: { _participante_id: string; _user_id: string }
        Returns: boolean
      }
      tomar_trabajo: { Args: { _trabajo_id: string }; Returns: Json }
      transicionar_entrega_pedido: {
        Args: { _accion: string; _datos?: Json; _pedido_id: string }
        Returns: Json
      }
      transicionar_orden_produccion: {
        Args: { _nuevo_estado: string; _orden_id: string }
        Returns: {
          creado_por: string | null
          created_at: string
          estado: string
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_planificada_fin: string | null
          fecha_planificada_inicio: string | null
          id: string
          notas: string
          numero: string
          participante_id: string | null
          pedido_id: string
          prioridad: string
          responsable_user_id: string | null
          sede_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ordenes_produccion"
          isOneToOne: true
          isSetofReturn: false
        }
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
