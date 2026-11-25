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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      agenda_dias_disponibilidad: {
        Row: {
          actualizado_por: string | null
          disponible: boolean
          fecha: string
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          disponible?: boolean
          fecha: string
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          disponible?: boolean
          fecha?: string
          updated_at?: string
        }
        Relationships: []
      }
      agenda_eventos: {
        Row: {
          activo: boolean
          creado_por: string
          created_at: string
          descripcion: string | null
          fin_at: string
          id: string
          inicio_at: string
          tipo: string
          titulo: string
          todo_el_dia: boolean
        }
        Insert: {
          activo?: boolean
          creado_por: string
          created_at?: string
          descripcion?: string | null
          fin_at: string
          id?: string
          inicio_at: string
          tipo?: string
          titulo: string
          todo_el_dia?: boolean
        }
        Update: {
          activo?: boolean
          creado_por?: string
          created_at?: string
          descripcion?: string | null
          fin_at?: string
          id?: string
          inicio_at?: string
          tipo?: string
          titulo?: string
          todo_el_dia?: boolean
        }
        Relationships: []
      }
      agenda_horarios: {
        Row: {
          activo: boolean
          creado_por: string
          created_at: string
          fin_at: string
          id: string
          inicio_at: string
          invitacion_descripcion: string | null
          invitacion_titulo: string | null
          invitacion_url: string | null
          solicitud_demo_id: string | null
          zona_horaria: string
        }
        Insert: {
          activo?: boolean
          creado_por: string
          created_at?: string
          fin_at: string
          id?: string
          inicio_at: string
          invitacion_descripcion?: string | null
          invitacion_titulo?: string | null
          invitacion_url?: string | null
          solicitud_demo_id?: string | null
          zona_horaria?: string
        }
        Update: {
          activo?: boolean
          creado_por?: string
          created_at?: string
          fin_at?: string
          id?: string
          inicio_at?: string
          invitacion_descripcion?: string | null
          invitacion_titulo?: string | null
          invitacion_url?: string | null
          solicitud_demo_id?: string | null
          zona_horaria?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_horarios_solicitud_demo_id_fkey"
            columns: ["solicitud_demo_id"]
            isOneToOne: false
            referencedRelation: "solicitudes_demo"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_reservas: {
        Row: {
          created_at: string
          descripcion: string | null
          enlace_reunion: string | null
          estado: string
          gestionado_por: string | null
          horario_id: string
          id: string
          nota_administrador: string | null
          participante_id: string | null
          solicitante_id: string
          tema: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          enlace_reunion?: string | null
          estado?: string
          gestionado_por?: string | null
          horario_id: string
          id?: string
          nota_administrador?: string | null
          participante_id?: string | null
          solicitante_id: string
          tema: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          enlace_reunion?: string | null
          estado?: string
          gestionado_por?: string | null
          horario_id?: string
          id?: string
          nota_administrador?: string | null
          participante_id?: string | null
          solicitante_id?: string
          tema?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_reservas_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "agenda_horarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_reservas_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      archivos_digitales_marketplace: {
        Row: {
          archivos_adjuntos: Json
          bucket_archivo: string
          bytes_archivo: number | null
          categoria: string
          created_at: string
          descripcion: string
          estado: string
          formatos: string[]
          id: string
          imagen_portada_url: string | null
          moneda: string
          nombre_archivo: string
          participante_id: string
          precio: number
          ruta_archivo: string
          titulo: string
          updated_at: string
          vendedor_usuario_id: string
        }
        Insert: {
          archivos_adjuntos?: Json
          bucket_archivo?: string
          bytes_archivo?: number | null
          categoria?: string
          created_at?: string
          descripcion?: string
          estado?: string
          formatos: string[]
          id?: string
          imagen_portada_url?: string | null
          moneda?: string
          nombre_archivo: string
          participante_id: string
          precio: number
          ruta_archivo: string
          titulo: string
          updated_at?: string
          vendedor_usuario_id: string
        }
        Update: {
          archivos_adjuntos?: Json
          bucket_archivo?: string
          bytes_archivo?: number | null
          categoria?: string
          created_at?: string
          descripcion?: string
          estado?: string
          formatos?: string[]
          id?: string
          imagen_portada_url?: string | null
          moneda?: string
          nombre_archivo?: string
          participante_id?: string
          precio?: number
          ruta_archivo?: string
          titulo?: string
          updated_at?: string
          vendedor_usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archivos_digitales_marketplace_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      aurum_afiliado_atribuciones: {
        Row: {
          afiliado_id: string
          atribuido_en: string
          created_at: string
          id: string
          referido_id: string
          referido_user_id: string
        }
        Insert: {
          afiliado_id: string
          atribuido_en?: string
          created_at?: string
          id?: string
          referido_id: string
          referido_user_id: string
        }
        Update: {
          afiliado_id?: string
          atribuido_en?: string
          created_at?: string
          id?: string
          referido_id?: string
          referido_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aurum_afiliado_atribuciones_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "aurum_afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aurum_afiliado_atribuciones_referido_id_fkey"
            columns: ["referido_id"]
            isOneToOne: true
            referencedRelation: "aurum_afiliado_referidos"
            referencedColumns: ["id"]
          },
        ]
      }
      aurum_afiliado_comisiones: {
        Row: {
          afiliado_id: string
          creada_en: string
          estado: string
          id: string
          importe_pen: number
          pago_id: string
          revertida_en: string | null
        }
        Insert: {
          afiliado_id: string
          creada_en?: string
          estado?: string
          id?: string
          importe_pen?: number
          pago_id: string
          revertida_en?: string | null
        }
        Update: {
          afiliado_id?: string
          creada_en?: string
          estado?: string
          id?: string
          importe_pen?: number
          pago_id?: string
          revertida_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aurum_afiliado_comisiones_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "aurum_afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aurum_afiliado_comisiones_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: true
            referencedRelation: "aurum_formacion_pagos"
            referencedColumns: ["id"]
          },
        ]
      }
      aurum_afiliado_movimientos: {
        Row: {
          afiliado_id: string
          comision_id: string | null
          creado_en: string
          descripcion: string | null
          id: string
          importe_pen: number
          retiro_id: string | null
          tipo: string
        }
        Insert: {
          afiliado_id: string
          comision_id?: string | null
          creado_en?: string
          descripcion?: string | null
          id?: string
          importe_pen: number
          retiro_id?: string | null
          tipo: string
        }
        Update: {
          afiliado_id?: string
          comision_id?: string | null
          creado_en?: string
          descripcion?: string | null
          id?: string
          importe_pen?: number
          retiro_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "aurum_afiliado_movimientos_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "aurum_afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aurum_afiliado_movimientos_comision_id_fkey"
            columns: ["comision_id"]
            isOneToOne: false
            referencedRelation: "aurum_afiliado_comisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aurum_movimiento_retiro_fk"
            columns: ["retiro_id"]
            isOneToOne: false
            referencedRelation: "aurum_afiliado_retiros"
            referencedColumns: ["id"]
          },
        ]
      }
      aurum_afiliado_referidos: {
        Row: {
          afiliado_id: string
          created_at: string
          id: string
          primera_visita_en: string
          vence_en: string
          visitante_hash: string
        }
        Insert: {
          afiliado_id: string
          created_at?: string
          id?: string
          primera_visita_en?: string
          vence_en: string
          visitante_hash: string
        }
        Update: {
          afiliado_id?: string
          created_at?: string
          id?: string
          primera_visita_en?: string
          vence_en?: string
          visitante_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "aurum_afiliado_referidos_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "aurum_afiliados"
            referencedColumns: ["id"]
          },
        ]
      }
      aurum_afiliado_retiros: {
        Row: {
          afiliado_id: string
          estado: string
          id: string
          importe_pen: number
          metodo_pago: string | null
          observaciones: string | null
          referencia_pago: string | null
          resuelto_en: string | null
          resuelto_por: string | null
          solicitado_en: string
          titular_pago: string | null
        }
        Insert: {
          afiliado_id: string
          estado?: string
          id?: string
          importe_pen: number
          metodo_pago?: string | null
          observaciones?: string | null
          referencia_pago?: string | null
          resuelto_en?: string | null
          resuelto_por?: string | null
          solicitado_en?: string
          titular_pago?: string | null
        }
        Update: {
          afiliado_id?: string
          estado?: string
          id?: string
          importe_pen?: number
          metodo_pago?: string | null
          observaciones?: string | null
          referencia_pago?: string | null
          resuelto_en?: string | null
          resuelto_por?: string | null
          solicitado_en?: string
          titular_pago?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aurum_afiliado_retiros_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "aurum_afiliados"
            referencedColumns: ["id"]
          },
        ]
      }
      aurum_afiliados: {
        Row: {
          aprobado_en: string | null
          aprobado_por: string | null
          codigo: string
          created_at: string
          estado: string
          id: string
          participante_id: string | null
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          codigo: string
          created_at?: string
          estado?: string
          id?: string
          participante_id?: string | null
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          codigo?: string
          created_at?: string
          estado?: string
          id?: string
          participante_id?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aurum_afiliados_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      aurum_afiliados_config: {
        Row: {
          comision_pen: number
          id: boolean
          precio_curso_usd: number
          retiro_minimo_pen: number
          updated_at: string
          ventana_atribucion_dias: number
        }
        Insert: {
          comision_pen?: number
          id?: boolean
          precio_curso_usd?: number
          retiro_minimo_pen?: number
          updated_at?: string
          ventana_atribucion_dias?: number
        }
        Update: {
          comision_pen?: number
          id?: boolean
          precio_curso_usd?: number
          retiro_minimo_pen?: number
          updated_at?: string
          ventana_atribucion_dias?: number
        }
        Relationships: []
      }
      aurum_analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json
          path: string
          referrer: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json
          path: string
          referrer?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json
          path?: string
          referrer?: string | null
          session_id?: string
        }
        Relationships: []
      }
      aurum_camera_calibration_global: {
        Row: {
          calibration_data: Json
          id: number
          updated_at: string
        }
        Insert: {
          calibration_data?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          calibration_data?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      aurum_community_activity: {
        Row: {
          activity_type: string
          actor_name: string
          created_at: string
          created_by: string | null
          dedupe_key: string | null
          id: string
          is_public: boolean
          metadata: Json
          participante_id: string | null
          summary: string | null
          target_url: string | null
          title: string
        }
        Insert: {
          activity_type: string
          actor_name: string
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json
          participante_id?: string | null
          summary?: string | null
          target_url?: string | null
          title: string
        }
        Update: {
          activity_type?: string
          actor_name?: string
          created_at?: string
          created_by?: string | null
          dedupe_key?: string | null
          id?: string
          is_public?: boolean
          metadata?: Json
          participante_id?: string | null
          summary?: string | null
          target_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "aurum_community_activity_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      aurum_community_stats: {
        Row: {
          display_order: number
          is_public: boolean
          label: string
          metric_key: string
          prefix: string | null
          suffix: string | null
          updated_at: string
          value: number
        }
        Insert: {
          display_order?: number
          is_public?: boolean
          label: string
          metric_key: string
          prefix?: string | null
          suffix?: string | null
          updated_at?: string
          value?: number
        }
        Update: {
          display_order?: number
          is_public?: boolean
          label?: string
          metric_key?: string
          prefix?: string | null
          suffix?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      aurum_formacion_pagos: {
        Row: {
          actualizado_en: string
          afiliado_id: string | null
          alumno_user_id: string
          creado_en: string
          curso_id: string
          estado: string
          id: string
          importe: number
          inscripcion_id: string | null
          moneda: string
          pagado_en: string | null
          participante_id: string
          proveedor: string
          referencia_externa: string | null
          referido_id: string | null
        }
        Insert: {
          actualizado_en?: string
          afiliado_id?: string | null
          alumno_user_id: string
          creado_en?: string
          curso_id: string
          estado?: string
          id?: string
          importe: number
          inscripcion_id?: string | null
          moneda?: string
          pagado_en?: string | null
          participante_id: string
          proveedor: string
          referencia_externa?: string | null
          referido_id?: string | null
        }
        Update: {
          actualizado_en?: string
          afiliado_id?: string | null
          alumno_user_id?: string
          creado_en?: string
          curso_id?: string
          estado?: string
          id?: string
          importe?: number
          inscripcion_id?: string | null
          moneda?: string
          pagado_en?: string | null
          participante_id?: string
          proveedor?: string
          referencia_externa?: string | null
          referido_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aurum_formacion_pagos_afiliado_id_fkey"
            columns: ["afiliado_id"]
            isOneToOne: false
            referencedRelation: "aurum_afiliados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aurum_formacion_pagos_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "formacion_cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aurum_formacion_pagos_inscripcion_id_fkey"
            columns: ["inscripcion_id"]
            isOneToOne: false
            referencedRelation: "formacion_inscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aurum_formacion_pagos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aurum_formacion_pagos_referido_id_fkey"
            columns: ["referido_id"]
            isOneToOne: false
            referencedRelation: "aurum_afiliado_referidos"
            referencedColumns: ["id"]
          },
        ]
      }
      aurum_plan_quotas: {
        Row: {
          almacenamiento_mib: number
          carpetas_mi_nube_max: number
          operaciones_comerciales_mes: number
          plan_id: string
          productos_catalogo_max: number
          updated_at: string
          updated_by: string | null
          usos_render_mes: number
        }
        Insert: {
          almacenamiento_mib: number
          carpetas_mi_nube_max?: number
          operaciones_comerciales_mes: number
          plan_id: string
          productos_catalogo_max?: number
          updated_at?: string
          updated_by?: string | null
          usos_render_mes: number
        }
        Update: {
          almacenamiento_mib?: number
          carpetas_mi_nube_max?: number
          operaciones_comerciales_mes?: number
          plan_id?: string
          productos_catalogo_max?: number
          updated_at?: string
          updated_by?: string | null
          usos_render_mes?: number
        }
        Relationships: []
      }
      aurum_transfer_usage: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string | null
          file_count: number
          id: string
          status: string
          total_bytes: number
          transfer_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string | null
          file_count?: number
          id?: string
          status?: string
          total_bytes?: number
          transfer_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string | null
          file_count?: number
          id?: string
          status?: string
          total_bytes?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aurum_transfer_usage_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: true
            referencedRelation: "aurum_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      aurum_transfers: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          file_count: number
          files: Json
          id: string
          status: string
          token_hash: string
          total_bytes: number
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          file_count?: number
          files?: Json
          id?: string
          status?: string
          token_hash: string
          total_bytes?: number
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          file_count?: number
          files?: Json
          id?: string
          status?: string
          token_hash?: string
          total_bytes?: number
        }
        Relationships: []
      }
      catalogo_categorias: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          parent_id: string | null
          participante_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          parent_id?: string | null
          participante_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          parent_id?: string | null
          participante_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_categorias_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "catalogo_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_categorias_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_colecciones: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          imagen_url: string | null
          nombre: string
          orden: number
          participante_id: string
          publicado: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          nombre: string
          orden?: number
          participante_id: string
          publicado?: boolean
          slug?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          imagen_url?: string | null
          nombre?: string
          orden?: number
          participante_id?: string
          publicado?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_colecciones_participante_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_colecciones_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_configuracion: {
        Row: {
          created_at: string
          descripcion: string | null
          direccion_contacto: string | null
          email_contacto: string | null
          enlaces_carrusel: Json
          formacion_descripcion: string | null
          formacion_imagen_url: string | null
          formacion_titulo: string | null
          formacion_visible: boolean
          frase_portada: string | null
          id: string
          imagenes_portada: Json
          intervalo_portada_segundos: number
          logo_url: string | null
          nombre_publico: string
          participante_id: string
          redes_sociales: Json
          slug: string
          telefono_contacto: string | null
          texto_superior_portada: string | null
          updated_at: string
          visible: boolean
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          direccion_contacto?: string | null
          email_contacto?: string | null
          enlaces_carrusel?: Json
          formacion_descripcion?: string | null
          formacion_imagen_url?: string | null
          formacion_titulo?: string | null
          formacion_visible?: boolean
          frase_portada?: string | null
          id?: string
          imagenes_portada?: Json
          intervalo_portada_segundos?: number
          logo_url?: string | null
          nombre_publico: string
          participante_id: string
          redes_sociales?: Json
          slug?: string
          telefono_contacto?: string | null
          texto_superior_portada?: string | null
          updated_at?: string
          visible?: boolean
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          direccion_contacto?: string | null
          email_contacto?: string | null
          enlaces_carrusel?: Json
          formacion_descripcion?: string | null
          formacion_imagen_url?: string | null
          formacion_titulo?: string | null
          formacion_visible?: boolean
          frase_portada?: string | null
          id?: string
          imagenes_portada?: Json
          intervalo_portada_segundos?: number
          logo_url?: string | null
          nombre_publico?: string
          participante_id?: string
          redes_sociales?: Json
          slug?: string
          telefono_contacto?: string | null
          texto_superior_portada?: string | null
          updated_at?: string
          visible?: boolean
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_configuracion_participante_fkey"
            columns: ["participante_id"]
            isOneToOne: true
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_configuracion_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: true
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_productos: {
        Row: {
          acabado: string | null
          aurum_render_url: string | null
          categoria: string
          codigo: string
          created_at: string
          descripcion: string | null
          destacado: boolean
          disponibilidad: string
          ficha_tecnica_url: string | null
          galeria: Json
          id: string
          imagen_principal_url: string | null
          medidas: string | null
          metal_principal: string | null
          moneda: string
          mostrar_ficha_tecnica: boolean
          mostrar_precio: boolean
          nombre: string
          notas_internas: string | null
          orden: number
          participante_id: string
          peso_gramos: number | null
          piedras: string | null
          precio_desde: number | null
          publicado: boolean
          slug: string
          talla: string | null
          tecnica: string | null
          tiempo_fabricacion_dias: number | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          acabado?: string | null
          aurum_render_url?: string | null
          categoria?: string
          codigo: string
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          disponibilidad?: string
          ficha_tecnica_url?: string | null
          galeria?: Json
          id?: string
          imagen_principal_url?: string | null
          medidas?: string | null
          metal_principal?: string | null
          moneda?: string
          mostrar_ficha_tecnica?: boolean
          mostrar_precio?: boolean
          nombre: string
          notas_internas?: string | null
          orden?: number
          participante_id: string
          peso_gramos?: number | null
          piedras?: string | null
          precio_desde?: number | null
          publicado?: boolean
          slug?: string
          talla?: string | null
          tecnica?: string | null
          tiempo_fabricacion_dias?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          acabado?: string | null
          aurum_render_url?: string | null
          categoria?: string
          codigo?: string
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          disponibilidad?: string
          ficha_tecnica_url?: string | null
          galeria?: Json
          id?: string
          imagen_principal_url?: string | null
          medidas?: string | null
          metal_principal?: string | null
          moneda?: string
          mostrar_ficha_tecnica?: boolean
          mostrar_precio?: boolean
          nombre?: string
          notas_internas?: string | null
          orden?: number
          participante_id?: string
          peso_gramos?: number | null
          piedras?: string | null
          precio_desde?: number | null
          publicado?: boolean
          slug?: string
          talla?: string | null
          tecnica?: string | null
          tiempo_fabricacion_dias?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_productos_participante_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_productos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
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
      catalogo_proyectos_nube: {
        Row: {
          archivos: Json
          carpeta: string
          created_at: string
          participante_id: string
          producto_id: string
          updated_at: string
          usuario_id: string
        }
        Insert: {
          archivos?: Json
          carpeta: string
          created_at?: string
          participante_id: string
          producto_id: string
          updated_at?: string
          usuario_id: string
        }
        Update: {
          archivos?: Json
          carpeta?: string
          created_at?: string
          participante_id?: string
          producto_id?: string
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_proyectos_nube_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: true
            referencedRelation: "catalogo_productos"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_solicitudes_cotizacion: {
        Row: {
          cantidad: number
          cliente_id: string | null
          cotizacion_id: string | null
          created_at: string
          email: string | null
          estado: string
          id: string
          mensaje: string | null
          nombre_cliente: string
          participante_id: string
          producto_id: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cantidad?: number
          cliente_id?: string | null
          cotizacion_id?: string | null
          created_at?: string
          email?: string | null
          estado?: string
          id?: string
          mensaje?: string | null
          nombre_cliente: string
          participante_id: string
          producto_id: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cantidad?: number
          cliente_id?: string | null
          cotizacion_id?: string | null
          created_at?: string
          email?: string | null
          estado?: string
          id?: string
          mensaje?: string | null
          nombre_cliente?: string
          participante_id?: string
          producto_id?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_solicitudes_cotizacion_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_solicitudes_cotizacion_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_solicitudes_cotizacion_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_solicitudes_cotizacion_producto_id_fkey"
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
          fecha_nacimiento: string | null
          id: string
          metadata: Json
          nombre: string
          notas: string
          participante_id: string | null
          sede_id: string | null
          telefono: string | null
          tipo: string
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
          fecha_nacimiento?: string | null
          id?: string
          metadata?: Json
          nombre: string
          notas?: string
          participante_id?: string | null
          sede_id?: string | null
          telefono?: string | null
          tipo?: string
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
          fecha_nacimiento?: string | null
          id?: string
          metadata?: Json
          nombre?: string
          notas?: string
          participante_id?: string | null
          sede_id?: string | null
          telefono?: string | null
          tipo?: string
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
          proveedor_nombre?: string
          proveedor_participante_id?: string | null
          sede_id?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_archivos_digitales: {
        Row: {
          archivo_id: string
          comprador_usuario_id: string
          created_at: string
          estado_pago: string
          id: string
          moneda: string
          pagado_en: string | null
          precio_pagado: number
          proveedor_pago: string | null
          referencia_pago: string | null
          updated_at: string
          vendedor_usuario_id: string
        }
        Insert: {
          archivo_id: string
          comprador_usuario_id: string
          created_at?: string
          estado_pago?: string
          id?: string
          moneda: string
          pagado_en?: string | null
          precio_pagado: number
          proveedor_pago?: string | null
          referencia_pago?: string | null
          updated_at?: string
          vendedor_usuario_id: string
        }
        Update: {
          archivo_id?: string
          comprador_usuario_id?: string
          created_at?: string
          estado_pago?: string
          id?: string
          moneda?: string
          pagado_en?: string | null
          precio_pagado?: number
          proveedor_pago?: string | null
          referencia_pago?: string | null
          updated_at?: string
          vendedor_usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_archivos_digitales_archivo_id_fkey"
            columns: ["archivo_id"]
            isOneToOne: false
            referencedRelation: "archivos_digitales_marketplace"
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
      consultas_comerciales: {
        Row: {
          created_at: string
          email: string
          estado: string
          id: string
          interes: string
          mensaje: string
          nombre: string
          telefono: string | null
        }
        Insert: {
          created_at?: string
          email: string
          estado?: string
          id?: string
          interes: string
          mensaje: string
          nombre: string
          telefono?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          estado?: string
          id?: string
          interes?: string
          mensaje?: string
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      contrato_numeradores: {
        Row: {
          anio: number
          sede_id: string
          ultimo_numero: number
        }
        Insert: {
          anio: number
          sede_id: string
          ultimo_numero?: number
        }
        Update: {
          anio?: number
          sede_id?: string
          ultimo_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "contrato_numeradores_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
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
          cotizacion_id: string | null
          created_at: string
          id: string
          notas: string
          numero: string
          origen: string
          pdf_generado_at: string | null
          pdf_sha256: string | null
          pdf_storage_path: string | null
          sede_id: string | null
          telefono: string
          total: number
          updated_at: string
        }
        Insert: {
          abonado?: number
          cliente?: string
          cotizacion_id?: string | null
          created_at?: string
          id?: string
          notas?: string
          numero: string
          origen?: string
          pdf_generado_at?: string | null
          pdf_sha256?: string | null
          pdf_storage_path?: string | null
          sede_id?: string | null
          telefono?: string
          total?: number
          updated_at?: string
        }
        Update: {
          abonado?: number
          cliente?: string
          cotizacion_id?: string | null
          created_at?: string
          id?: string
          notas?: string
          numero?: string
          origen?: string
          pdf_generado_at?: string | null
          pdf_sha256?: string | null
          pdf_storage_path?: string | null
          sede_id?: string | null
          telefono?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
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
          sede_id: string
          ultimo_numero: number
        }
        Insert: {
          anio: number
          sede_id: string
          ultimo_numero?: number
        }
        Update: {
          anio?: number
          sede_id?: string
          ultimo_numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_numeradores_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizacion_respuestas_cliente: {
        Row: {
          accion: string
          comentario: string
          cotizacion_id: string
          created_at: string
          id: string
        }
        Insert: {
          accion: string
          comentario?: string
          cotizacion_id: string
          created_at?: string
          id?: string
        }
        Update: {
          accion?: string
          comentario?: string
          cotizacion_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotizacion_respuestas_cliente_cotizacion_id_fkey"
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
          seguimiento_codigo: string
          seguimiento_token: string
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
          seguimiento_codigo?: string
          seguimiento_token?: string
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
          seguimiento_codigo?: string
          seguimiento_token?: string
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
          comunidad_visible: boolean
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
          comunidad_visible?: boolean
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
          tipo_participante?: string
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          comunidad_visible?: boolean
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
      formacion_contenidos_lectura: {
        Row: {
          publicado: boolean
          secciones: Json
          sesion_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          publicado?: boolean
          secciones?: Json
          sesion_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          publicado?: boolean
          secciones?: Json
          sesion_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formacion_contenidos_lectura_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: true
            referencedRelation: "formacion_sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      formacion_cursos: {
        Row: {
          creado_por: string | null
          created_at: string
          descripcion: string | null
          duracion_horas: number
          estado: string
          id: string
          modalidad: string
          participante_id: string
          slug: string
          titulo: string
          updated_at: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          duracion_horas?: number
          estado?: string
          id?: string
          modalidad?: string
          participante_id: string
          slug: string
          titulo: string
          updated_at?: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          duracion_horas?: number
          estado?: string
          id?: string
          modalidad?: string
          participante_id?: string
          slug?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formacion_cursos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      formacion_examenes: {
        Row: {
          aleatorizar_preguntas: boolean
          creado_por: string | null
          created_at: string
          curso_id: string
          disponible_desde: string | null
          disponible_hasta: string | null
          duracion_minutos: number | null
          id: string
          instrucciones: string | null
          intentos_permitidos: number
          participante_id: string
          permitir_retroceso: boolean
          publicado: boolean
          puntaje_maximo: number
          sesion_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          aleatorizar_preguntas?: boolean
          creado_por?: string | null
          created_at?: string
          curso_id: string
          disponible_desde?: string | null
          disponible_hasta?: string | null
          duracion_minutos?: number | null
          id?: string
          instrucciones?: string | null
          intentos_permitidos?: number
          participante_id: string
          permitir_retroceso?: boolean
          publicado?: boolean
          puntaje_maximo?: number
          sesion_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          aleatorizar_preguntas?: boolean
          creado_por?: string | null
          created_at?: string
          curso_id?: string
          disponible_desde?: string | null
          disponible_hasta?: string | null
          duracion_minutos?: number | null
          id?: string
          instrucciones?: string | null
          intentos_permitidos?: number
          participante_id?: string
          permitir_retroceso?: boolean
          publicado?: boolean
          puntaje_maximo?: number
          sesion_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formacion_examenes_curso_fk"
            columns: ["curso_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_cursos"
            referencedColumns: ["id", "participante_id"]
          },
          {
            foreignKeyName: "formacion_examenes_sesion_fk"
            columns: ["sesion_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_sesiones"
            referencedColumns: ["id", "participante_id"]
          },
        ]
      }
      formacion_inscripciones: {
        Row: {
          alumno_user_id: string | null
          created_at: string
          curso_id: string
          email_alumno: string
          estado: string
          fecha_inscripcion: string
          id: string
          nombre_alumno: string | null
          participante_id: string
          updated_at: string
        }
        Insert: {
          alumno_user_id?: string | null
          created_at?: string
          curso_id: string
          email_alumno: string
          estado?: string
          fecha_inscripcion?: string
          id?: string
          nombre_alumno?: string | null
          participante_id: string
          updated_at?: string
        }
        Update: {
          alumno_user_id?: string | null
          created_at?: string
          curso_id?: string
          email_alumno?: string
          estado?: string
          fecha_inscripcion?: string
          id?: string
          nombre_alumno?: string | null
          participante_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formacion_inscripciones_curso_fk"
            columns: ["curso_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_cursos"
            referencedColumns: ["id", "participante_id"]
          },
        ]
      }
      formacion_intentos: {
        Row: {
          alumno_user_id: string
          calificacion: number | null
          calificado_en: string | null
          calificado_por: string | null
          curso_id: string
          enviado_en: string
          estado: string
          examen_id: string
          id: string
          iniciado_en: string
          numero_intento: number
          observaciones_docente: string | null
          orden_preguntas: string[] | null
          participante_id: string
          pregunta_actual: number
          puntaje_maximo: number
          puntaje_obtenido: number
          respuestas: Json
          vence_en: string | null
        }
        Insert: {
          alumno_user_id: string
          calificacion?: number | null
          calificado_en?: string | null
          calificado_por?: string | null
          curso_id: string
          enviado_en?: string
          estado?: string
          examen_id: string
          id?: string
          iniciado_en?: string
          numero_intento: number
          observaciones_docente?: string | null
          orden_preguntas?: string[] | null
          participante_id: string
          pregunta_actual?: number
          puntaje_maximo: number
          puntaje_obtenido?: number
          respuestas?: Json
          vence_en?: string | null
        }
        Update: {
          alumno_user_id?: string
          calificacion?: number | null
          calificado_en?: string | null
          calificado_por?: string | null
          curso_id?: string
          enviado_en?: string
          estado?: string
          examen_id?: string
          id?: string
          iniciado_en?: string
          numero_intento?: number
          observaciones_docente?: string | null
          orden_preguntas?: string[] | null
          participante_id?: string
          pregunta_actual?: number
          puntaje_maximo?: number
          puntaje_obtenido?: number
          respuestas?: Json
          vence_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formacion_intentos_curso_fk"
            columns: ["curso_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_cursos"
            referencedColumns: ["id", "participante_id"]
          },
          {
            foreignKeyName: "formacion_intentos_examen_fk"
            columns: ["examen_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_examenes"
            referencedColumns: ["id", "participante_id"]
          },
        ]
      }
      formacion_materiales: {
        Row: {
          created_at: string
          curso_id: string
          descripcion: string | null
          id: string
          mime_type: string
          nombre_archivo: string
          orden: number
          participante_id: string
          publicado: boolean
          ruta_storage: string
          sesion_id: string | null
          subido_por: string | null
          tamano_bytes: number
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          curso_id: string
          descripcion?: string | null
          id?: string
          mime_type: string
          nombre_archivo: string
          orden?: number
          participante_id: string
          publicado?: boolean
          ruta_storage: string
          sesion_id?: string | null
          subido_por?: string | null
          tamano_bytes: number
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          curso_id?: string
          descripcion?: string | null
          id?: string
          mime_type?: string
          nombre_archivo?: string
          orden?: number
          participante_id?: string
          publicado?: boolean
          ruta_storage?: string
          sesion_id?: string | null
          subido_por?: string | null
          tamano_bytes?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formacion_materiales_curso_fk"
            columns: ["curso_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_cursos"
            referencedColumns: ["id", "participante_id"]
          },
          {
            foreignKeyName: "formacion_materiales_sesion_fk"
            columns: ["sesion_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_sesiones"
            referencedColumns: ["id", "participante_id"]
          },
        ]
      }
      formacion_notas: {
        Row: {
          actualizado_por: string | null
          created_at: string
          curso_id: string
          estado: string
          id: string
          inscripcion_id: string
          nota_final: number | null
          observaciones: string | null
          participante_id: string
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          created_at?: string
          curso_id: string
          estado?: string
          id?: string
          inscripcion_id: string
          nota_final?: number | null
          observaciones?: string | null
          participante_id: string
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          created_at?: string
          curso_id?: string
          estado?: string
          id?: string
          inscripcion_id?: string
          nota_final?: number | null
          observaciones?: string | null
          participante_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formacion_notas_curso_fk"
            columns: ["curso_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_cursos"
            referencedColumns: ["id", "participante_id"]
          },
          {
            foreignKeyName: "formacion_notas_inscripcion_fk"
            columns: ["inscripcion_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_inscripciones"
            referencedColumns: ["id", "participante_id"]
          },
          {
            foreignKeyName: "formacion_notas_inscripcion_id_fkey"
            columns: ["inscripcion_id"]
            isOneToOne: true
            referencedRelation: "formacion_inscripciones"
            referencedColumns: ["id"]
          },
        ]
      }
      formacion_preguntas: {
        Row: {
          created_at: string
          enunciado: string
          examen_id: string
          id: string
          obligatoria: boolean
          opciones: Json
          orden: number
          participante_id: string
          puntaje: number
          respuesta_correcta: Json | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enunciado: string
          examen_id: string
          id?: string
          obligatoria?: boolean
          opciones?: Json
          orden?: number
          participante_id: string
          puntaje?: number
          respuesta_correcta?: Json | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enunciado?: string
          examen_id?: string
          id?: string
          obligatoria?: boolean
          opciones?: Json
          orden?: number
          participante_id?: string
          puntaje?: number
          respuesta_correcta?: Json | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formacion_preguntas_examen_fk"
            columns: ["examen_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_examenes"
            referencedColumns: ["id", "participante_id"]
          },
        ]
      }
      formacion_progreso_lecturas: {
        Row: {
          alumno_user_id: string
          completada_en: string
          sesion_id: string
        }
        Insert: {
          alumno_user_id: string
          completada_en?: string
          sesion_id: string
        }
        Update: {
          alumno_user_id?: string
          completada_en?: string
          sesion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formacion_progreso_lecturas_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "formacion_sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      formacion_sesiones: {
        Row: {
          bloqueada: boolean
          created_at: string
          curso_id: string
          descripcion: string | null
          duracion_horas: number
          fecha_programada: string | null
          id: string
          numero: number
          orden: number
          participante_id: string
          publicada: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          bloqueada?: boolean
          created_at?: string
          curso_id: string
          descripcion?: string | null
          duracion_horas?: number
          fecha_programada?: string | null
          id?: string
          numero: number
          orden?: number
          participante_id: string
          publicada?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          bloqueada?: boolean
          created_at?: string
          curso_id?: string
          descripcion?: string | null
          duracion_horas?: number
          fecha_programada?: string | null
          id?: string
          numero?: number
          orden?: number
          participante_id?: string
          publicada?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formacion_sesiones_curso_fk"
            columns: ["curso_id", "participante_id"]
            isOneToOne: false
            referencedRelation: "formacion_cursos"
            referencedColumns: ["id", "participante_id"]
          },
        ]
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
      identidades_comerciales: {
        Row: {
          activa: boolean
          ciudad: string | null
          color_principal: string | null
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          identificador_fiscal_label: string | null
          impuesto_activo: boolean | null
          impuesto_incluido: boolean | null
          impuesto_nombre: string | null
          impuesto_tasa: number | null
          logo_url: string | null
          metadata: Json
          moneda_codigo: string | null
          moneda_simbolo: string | null
          nombre_comercial: string
          pais_codigo: string | null
          pais_nombre: string | null
          participante_id: string | null
          pie_documento: string | null
          razon_social: string | null
          rnp_bienes: string | null
          rpp_servicios: string | null
          ruc: string | null
          sede_id: string | null
          sitio_web: string | null
          telefono: string | null
          updated_at: string
          whatsapp: string | null
          zona_horaria: string | null
        }
        Insert: {
          activa?: boolean
          ciudad?: string | null
          color_principal?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          identificador_fiscal_label?: string | null
          impuesto_activo?: boolean | null
          impuesto_incluido?: boolean | null
          impuesto_nombre?: string | null
          impuesto_tasa?: number | null
          logo_url?: string | null
          metadata?: Json
          moneda_codigo?: string | null
          moneda_simbolo?: string | null
          nombre_comercial: string
          pais_codigo?: string | null
          pais_nombre?: string | null
          participante_id?: string | null
          pie_documento?: string | null
          razon_social?: string | null
          rnp_bienes?: string | null
          rpp_servicios?: string | null
          ruc?: string | null
          sede_id?: string | null
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string
          whatsapp?: string | null
          zona_horaria?: string | null
        }
        Update: {
          activa?: boolean
          ciudad?: string | null
          color_principal?: string | null
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          identificador_fiscal_label?: string | null
          impuesto_activo?: boolean | null
          impuesto_incluido?: boolean | null
          impuesto_nombre?: string | null
          impuesto_tasa?: number | null
          logo_url?: string | null
          metadata?: Json
          moneda_codigo?: string | null
          moneda_simbolo?: string | null
          nombre_comercial?: string
          pais_codigo?: string | null
          pais_nombre?: string | null
          participante_id?: string | null
          pie_documento?: string | null
          razon_social?: string | null
          rnp_bienes?: string | null
          rpp_servicios?: string | null
          ruc?: string | null
          sede_id?: string | null
          sitio_web?: string | null
          telefono?: string | null
          updated_at?: string
          whatsapp?: string | null
          zona_horaria?: string | null
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
          proveedor?: string
          sede_id?: string | null
          stock?: number
          ubicacion?: string
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
      inventario_joya_eventos: {
        Row: {
          created_at: string
          estado_anterior: string | null
          estado_nuevo: string | null
          id: string
          joya_id: string
          nota: string | null
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
        ]
      }
      inventario_joyas: {
        Row: {
          cantidad: number
          codigo: string
          created_at: string
          estado: string
          id: string
          importacion_id: string
          ley: string
          metadata: Json
          metal: string
          nombre: string
          origen: string
          peso: number | null
          piedras: string
          qr_token: string
          sede_id: string | null
          talla: string
          updated_at: string
        }
        Insert: {
          cantidad?: number
          codigo?: string
          created_at?: string
          estado?: string
          id?: string
          importacion_id?: string
          ley?: string
          metadata?: Json
          metal?: string
          nombre?: string
          origen?: string
          peso?: number | null
          piedras?: string
          qr_token?: string
          sede_id?: string | null
          talla?: string
          updated_at?: string
        }
        Update: {
          cantidad?: number
          codigo?: string
          created_at?: string
          estado?: string
          id?: string
          importacion_id?: string
          ley?: string
          metadata?: Json
          metal?: string
          nombre?: string
          origen?: string
          peso?: number | null
          piedras?: string
          qr_token?: string
          sede_id?: string | null
          talla?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_joyas_sede_id_fkey"
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
          costo_unitario: number | null
          created_at: string
          id: string
          material_id: string
          motivo: string
          orden_produccion_id: string | null
          pedido_id: string | null
          referencia_externa: string
          stock_anterior: number
          stock_posterior: number
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          area?: string
          cantidad: number
          costo_unitario?: number | null
          created_at?: string
          id?: string
          material_id: string
          motivo?: string
          orden_produccion_id?: string | null
          pedido_id?: string | null
          referencia_externa?: string
          stock_anterior?: number
          stock_posterior?: number
          tipo?: string
          usuario_id?: string | null
        }
        Update: {
          area?: string
          cantidad?: number
          costo_unitario?: number | null
          created_at?: string
          id?: string
          material_id?: string
          motivo?: string
          orden_produccion_id?: string | null
          pedido_id?: string | null
          referencia_externa?: string
          stock_anterior?: number
          stock_posterior?: number
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
            foreignKeyName: "inventario_movimientos_orden_produccion_id_fkey"
            columns: ["orden_produccion_id"]
            isOneToOne: false
            referencedRelation: "ordenes_produccion"
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
      mensajes_automaticos_taller: {
        Row: {
          actualizado_por: string | null
          created_at: string
          mensaje_cumpleanos: string
          participante_id: string
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          created_at?: string
          mensaje_cumpleanos?: string
          participante_id: string
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          created_at?: string
          mensaje_cumpleanos?: string
          participante_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_automaticos_taller_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: true
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
        ]
      }
      mi_nube_compartidas: {
        Row: {
          carpeta: string
          creado_por: string
          created_at: string
          destinatario_participante_id: string
          id: string
          propietario_participante_id: string
          propietario_usuario_id: string
          revoked_at: string | null
        }
        Insert: {
          carpeta: string
          creado_por?: string
          created_at?: string
          destinatario_participante_id: string
          id?: string
          propietario_participante_id: string
          propietario_usuario_id: string
          revoked_at?: string | null
        }
        Update: {
          carpeta?: string
          creado_por?: string
          created_at?: string
          destinatario_participante_id?: string
          id?: string
          propietario_participante_id?: string
          propietario_usuario_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mi_nube_compartidas_destinatario_participante_id_fkey"
            columns: ["destinatario_participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mi_nube_compartidas_propietario_participante_id_fkey"
            columns: ["propietario_participante_id"]
            isOneToOne: false
            referencedRelation: "ecosistema_participantes"
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
          pedido_id?: string
          prioridad?: string
          responsable_user_id?: string | null
          sede_id?: string | null
          updated_at?: string
        }
        Relationships: [
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
          es_vigente_fabricacion: boolean
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
          es_vigente_fabricacion?: boolean
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
          es_vigente_fabricacion?: boolean
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
          guia_envio: string
          importe: number
          listo_entrega_observaciones: string
          medio_envio: string
          notas_entrega: string
          notas_envio: string
          notas_ventas: string
          packing_estado: string
          pedido_id: string
          receptor_envio: string
          saldo: number
          seguimiento_token: string
          telefono: string
          updated_at: string
          usuario_entrega: string
          usuario_envio: string
          usuario_listo_entrega: string
          ventas_actualizado_en: string | null
          ventas_actualizado_por: string
          ventas_estado: string
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
          guia_envio?: string
          importe?: number
          listo_entrega_observaciones?: string
          medio_envio?: string
          notas_entrega?: string
          notas_envio?: string
          notas_ventas?: string
          packing_estado?: string
          pedido_id: string
          receptor_envio?: string
          saldo?: number
          seguimiento_token?: string
          telefono?: string
          updated_at?: string
          usuario_entrega?: string
          usuario_envio?: string
          usuario_listo_entrega?: string
          ventas_actualizado_en?: string | null
          ventas_actualizado_por?: string
          ventas_estado?: string
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
          guia_envio?: string
          importe?: number
          listo_entrega_observaciones?: string
          medio_envio?: string
          notas_entrega?: string
          notas_envio?: string
          notas_ventas?: string
          packing_estado?: string
          pedido_id?: string
          receptor_envio?: string
          saldo?: number
          seguimiento_token?: string
          telefono?: string
          updated_at?: string
          usuario_entrega?: string
          usuario_envio?: string
          usuario_listo_entrega?: string
          ventas_actualizado_en?: string | null
          ventas_actualizado_por?: string
          ventas_estado?: string
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
          pedido_id: string
          sede_id: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          datos?: Json
          id?: string
          pedido_id: string
          sede_id: string
          tipo: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          datos?: Json
          id?: string
          pedido_id?: string
          sede_id?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
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
          cliente_id: string | null
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
          evidencia_entrega_url: string | null
          fecha_entrega: string | null
          fecha_entregado: string | null
          fecha_envio: string | null
          fecha_ingreso: string
          fecha_listo_entrega: string | null
          guia_envio: string
          id: string
          importe: number
          listo_entrega_observaciones: string | null
          material: string
          medio_envio: string
          notas: string
          notas_entrega: string | null
          notas_envio: string | null
          notas_ventas: string
          origen: string
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
          cliente_id?: string | null
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
          evidencia_entrega_url?: string | null
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
          cliente_id?: string | null
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
          evidencia_entrega_url?: string | null
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
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
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
      produccion_eventos: {
        Row: {
          created_at: string
          datos: Json
          estado_anterior: string | null
          estado_nuevo: string | null
          id: string
          orden_produccion_id: string | null
          pedido_id: string | null
          pieza_id: string | null
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
          pedido_id?: string | null
          pieza_id?: string | null
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
          pedido_id?: string | null
          pieza_id?: string | null
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
            foreignKeyName: "produccion_eventos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produccion_eventos_pieza_id_fkey"
            columns: ["pieza_id"]
            isOneToOne: false
            referencedRelation: "piezas_terminadas"
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
          cliente_id: string | null
          codigo: string
          created_at: string
          descripcion: string
          estado: string
          id: string
          ley: string | null
          metal: string | null
          nombre: string
          peso_estimado: number | null
          piedras: string | null
          talla: string | null
        }
        Insert: {
          cantidad_piezas?: number
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string
          estado?: string
          id?: string
          ley?: string | null
          metal?: string | null
          nombre: string
          peso_estimado?: number | null
          piedras?: string | null
          talla?: string | null
        }
        Update: {
          cantidad_piezas?: number
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          descripcion?: string
          estado?: string
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
      sede_modalidades: {
        Row: {
          created_at: string
          produccion_activa: boolean
          sede_id: string
          servicios_externos_activos: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          produccion_activa?: boolean
          sede_id: string
          servicios_externos_activos?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          produccion_activa?: boolean
          sede_id?: string
          servicios_externos_activos?: boolean
          updated_at?: string
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
          zona_horaria: string
        }
        Insert: {
          activa?: boolean
          ciudad?: string
          created_at?: string
          id?: string
          modo?: string
          nombre: string
          updated_at?: string
          zona_horaria?: string
        }
        Update: {
          activa?: boolean
          ciudad?: string
          created_at?: string
          id?: string
          modo?: string
          nombre?: string
          updated_at?: string
          zona_horaria?: string
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
      solicitudes_demo: {
        Row: {
          created_at: string
          email: string
          empresa: string
          estado: string
          fecha_reunion_at: string | null
          horario_preferido: string | null
          id: string
          interes: string
          nombre: string
          origen: string
          telefono: string
        }
        Insert: {
          created_at?: string
          email: string
          empresa: string
          estado?: string
          fecha_reunion_at?: string | null
          horario_preferido?: string | null
          id?: string
          interes: string
          nombre: string
          origen?: string
          telefono: string
        }
        Update: {
          created_at?: string
          email?: string
          empresa?: string
          estado?: string
          fecha_reunion_at?: string | null
          horario_preferido?: string | null
          id?: string
          interes?: string
          nombre?: string
          origen?: string
          telefono?: string
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
      tarifas_mano_obra: {
        Row: {
          activo: boolean
          area: string
          created_at: string
          id: string
          moneda: string
          notas: string
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
          sede_id?: string | null
          tarifa_hora?: number
          usuario_id?: string | null
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_mano_obra_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      tienda_insumos_productos: {
        Row: {
          categoria: string
          codigo: string | null
          created_at: string
          descripcion: string | null
          destacado: boolean
          id: string
          imagen_url: string | null
          moneda: string
          nombre: string
          orden: number
          precio: number | null
          publicado: boolean
          slug: string
          stock: number | null
          tienda_id: string
          unidad: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          codigo?: string | null
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          id?: string
          imagen_url?: string | null
          moneda?: string
          nombre: string
          orden?: number
          precio?: number | null
          publicado?: boolean
          slug: string
          stock?: number | null
          tienda_id: string
          unidad?: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          codigo?: string | null
          created_at?: string
          descripcion?: string | null
          destacado?: boolean
          id?: string
          imagen_url?: string | null
          moneda?: string
          nombre?: string
          orden?: number
          precio?: number | null
          publicado?: boolean
          slug?: string
          stock?: number | null
          tienda_id?: string
          unidad?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tienda_insumos_productos_tienda_id_fkey"
            columns: ["tienda_id"]
            isOneToOne: false
            referencedRelation: "tiendas_insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      tiendas_insumos: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          moneda: string
          nombre_publico: string
          participante_id: string
          slug: string
          updated_at: string
          visible: boolean
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          moneda?: string
          nombre_publico: string
          participante_id: string
          slug: string
          updated_at?: string
          visible?: boolean
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          moneda?: string
          nombre_publico?: string
          participante_id?: string
          slug?: string
          updated_at?: string
          visible?: boolean
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiendas_insumos_participante_id_fkey"
            columns: ["participante_id"]
            isOneToOne: true
            referencedRelation: "ecosistema_participantes"
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
            foreignKeyName: "user_roles_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      visor_3d_enlaces: {
        Row: {
          creado_en: string
          expira_en: string
          modelo_ruta: string | null
          modelo_url: string | null
          nombre: string
          propietario_id: string
          token: string
        }
        Insert: {
          creado_en?: string
          expira_en: string
          modelo_ruta?: string | null
          modelo_url?: string | null
          nombre?: string
          propietario_id: string
          token: string
        }
        Update: {
          creado_en?: string
          expira_en?: string
          modelo_ruta?: string | null
          modelo_url?: string | null
          nombre?: string
          propietario_id?: string
          token?: string
        }
        Relationships: []
      }
      visor_3d_integraciones: {
        Row: {
          activa: boolean
          actualizado_en: string
          creado_en: string
          dominios_autorizados: string[]
          id: string
          modelo_ruta: string
          nombre: string
          permitir_cambio_gema: boolean
          permitir_cambio_metal: boolean
          permitir_contacto: boolean
          permitir_cotizacion: boolean
          permitir_enlace_publico: boolean
          permitir_incrustacion: boolean
          propietario_id: string
        }
        Insert: {
          activa?: boolean
          actualizado_en?: string
          creado_en?: string
          dominios_autorizados?: string[]
          id?: string
          modelo_ruta: string
          nombre?: string
          permitir_cambio_gema?: boolean
          permitir_cambio_metal?: boolean
          permitir_contacto?: boolean
          permitir_cotizacion?: boolean
          permitir_enlace_publico?: boolean
          permitir_incrustacion?: boolean
          propietario_id: string
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          creado_en?: string
          dominios_autorizados?: string[]
          id?: string
          modelo_ruta?: string
          nombre?: string
          permitir_cambio_gema?: boolean
          permitir_cambio_metal?: boolean
          permitir_contacto?: boolean
          permitir_cotizacion?: boolean
          permitir_enlace_publico?: boolean
          permitir_incrustacion?: boolean
          propietario_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agenda_actualizar_horario: {
        Args: { _fin_at: string; _horario_id: string; _inicio_at: string }
        Returns: undefined
      }
      agenda_actualizar_reserva: {
        Args: {
          _enlace_reunion?: string
          _estado: string
          _nota_administrador?: string
          _reserva_id: string
        }
        Returns: undefined
      }
      agenda_actualizar_solicitud_demo: {
        Args: { _estado: string; _solicitud_id: string }
        Returns: undefined
      }
      agenda_cancelar_reserva: {
        Args: { _reserva_id: string }
        Returns: undefined
      }
      agenda_crear_horario: {
        Args: { _fin_at: string; _inicio_at: string; _zona_horaria?: string }
        Returns: string
      }
      agenda_eliminar_horarios: {
        Args: { _horario_ids: string[] }
        Returns: {
          eliminados: number
          protegidos: number
        }[]
      }
      agenda_es_administrador: { Args: never; Returns: boolean }
      agenda_establecer_disponibilidad_dia: {
        Args: { _disponible: boolean; _fecha: string }
        Returns: undefined
      }
      agenda_guardar_invitacion_horario: {
        Args: {
          _descripcion: string
          _horario_id: string
          _titulo: string
          _url: string
        }
        Returns: undefined
      }
      agenda_listar_dias_disponibilidad: {
        Args: { _desde: string; _hasta: string }
        Returns: {
          disponible: boolean
          fecha: string
        }[]
      }
      agenda_listar_horarios: {
        Args: never
        Returns: {
          fin_at: string
          id: string
          inicio_at: string
          invitacion_descripcion: string
          invitacion_titulo: string
          invitacion_url: string
          zona_horaria: string
        }[]
      }
      agenda_listar_horarios_publicos: {
        Args: never
        Returns: {
          fin_at: string
          id: string
          inicio_at: string
          invitacion_descripcion: string
          invitacion_titulo: string
          invitacion_url: string
          zona_horaria: string
        }[]
      }
      agenda_listar_reservas: {
        Args: never
        Returns: {
          created_at: string
          descripcion: string
          enlace_reunion: string
          estado: string
          fin_at: string
          horario_id: string
          id: string
          inicio_at: string
          nota_administrador: string
          solicitante_id: string
          solicitante_nombre: string
          taller_nombre: string
          tema: string
        }[]
      }
      agenda_listar_solicitudes_demo: {
        Args: never
        Returns: {
          created_at: string
          email: string
          empresa: string
          estado: string
          fecha_reunion_at: string
          horario_preferido: string
          id: string
          interes: string
          nombre: string
          telefono: string
        }[]
      }
      agenda_reservar: {
        Args: { _descripcion?: string; _horario_id: string; _tema: string }
        Returns: string
      }
      agenda_solicitar_demo_publica: {
        Args: {
          _email: string
          _empresa: string
          _horario_id: string
          _horario_preferido?: string
          _interes: string
          _nombre: string
          _telefono: string
        }
        Returns: {
          fecha_reunion_at: string
          solicitud_id: string
        }[]
      }
      asignar_participante_externo_trabajo: {
        Args: { _participante_id: string; _trabajo_id: string }
        Returns: Json
      }
      asignar_responsable_trabajo: {
        Args: { _responsable_user_id: string; _trabajo_id: string }
        Returns: Json
      }
      aurum_afiliado_es_propietario: {
        Args: { _afiliado_id: string }
        Returns: boolean
      }
      aurum_confirmar_pago_afiliado: {
        Args: {
          _importe_confirmado: number
          _moneda_confirmada: string
          _pago_id: string
          _referencia_externa: string
        }
        Returns: Json
      }
      aurum_contar_productos_catalogo_owner: {
        Args: { p_participante_id: string }
        Returns: number
      }
      aurum_emitir_actividad_comunidad: {
        Args: {
          _dedupe_key?: string
          _metadata?: Json
          _participante_id: string
          _resumen?: string
          _target_url?: string
          _tipo: string
          _titulo: string
        }
        Returns: undefined
      }
      aurum_registrar_visita_afiliado: {
        Args: { _codigo: string; _visitante_hash: string }
        Returns: string
      }
      aurum_resolver_retiro_afiliado: {
        Args: {
          _decision: string
          _observaciones?: string
          _referencia_pago?: string
          _retiro_id: string
        }
        Returns: undefined
      }
      aurum_resumen_mi_nube_owner: {
        Args: { p_participante_id: string }
        Returns: {
          bytes_compartidos: number
          bytes_propios: number
          carpetas_compartidas: number
          carpetas_propias: number
        }[]
      }
      aurum_revertir_comision_afiliado: {
        Args: { _motivo: string; _pago_id: string }
        Returns: undefined
      }
      aurum_solicitar_retiro_afiliado: {
        Args: {
          _afiliado_id: string
          _importe_pen: number
          _metodo_pago: string
          _titular_pago: string
        }
        Returns: string
      }
      aurum_vincular_referido_afiliado: {
        Args: { _visitante_hash: string }
        Returns: string
      }
      cambiar_estado_cotizacion: {
        Args: { _cotizacion_id: string; _nuevo_estado: string }
        Returns: undefined
      }
      cambiar_estado_trabajo: {
        Args: { _nuevo_estado: string; _trabajo_id: string }
        Returns: undefined
      }
      catalogo_normalizar_slug: { Args: { _value: string }; Returns: string }
      cerrar_orden_produccion: {
        Args: { _observaciones?: string; _orden_id: string }
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
      claim_aurum_transfer: {
        Args: { _token_hash: string }
        Returns: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          file_count: number
          files: Json
          id: string
          status: string
          token_hash: string
          total_bytes: number
        }
        SetofOptions: {
          from: "*"
          to: "aurum_transfers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      codigo_taller_cotizacion: { Args: { _sede_id: string }; Returns: string }
      consultar_joya_publica: {
        Args: { _token: string }
        Returns: {
          codigo: string
          estado: string
          id: string
          ley: string
          metal: string
          nombre: string
          peso: number
          piedras: string
          talla: string
          taller: string
        }[]
      }
      convertir_cotizacion_a_pedido: {
        Args: { _cotizacion_id: string }
        Returns: Json
      }
      convertir_cotizacion_a_pedido_contrato: {
        Args: { _cotizacion_id: string }
        Returns: Json
      }
      crear_contrato_comercial: {
        Args: {
          _cliente: string
          _cotizacion_id?: string
          _notas: string
          _origen: string
          _sede_id: string
          _telefono: string
          _total: number
        }
        Returns: Json
      }
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
      crear_enlace_visor_3d:
        | {
            Args: { _modelo_url: string; _nombre: string; _token: string }
            Returns: string
          }
        | {
            Args: {
              _modelo_ruta: string
              _modelo_url: string
              _nombre: string
              _token: string
            }
            Returns: string
          }
      crear_version_cotizacion: {
        Args: { _cotizacion_id: string }
        Returns: string
      }
      enviar_intento_formacion: {
        Args: { _examen_id: string; _respuestas: Json }
        Returns: string
      }
      es_admin: { Args: { _user_id: string }; Returns: boolean }
      es_interno: { Args: { _user_id: string }; Returns: boolean }
      formacion_es_docente: {
        Args: { _participante_id: string }
        Returns: boolean
      }
      formacion_esta_inscrito: {
        Args: { _curso_id: string; _user_id: string }
        Returns: boolean
      }
      get_aurum_transfer_usage_metrics: {
        Args: never
        Returns: {
          available_count: number
          downloaded_count: number
          expired_count: number
          file_count: number
          last_activity: string
          total_bytes: number
          transfer_count: number
        }[]
      }
      guardar_configuracion_taller: {
        Args: {
          _especialidad_ids?: string[]
          _produccion_activa?: boolean
          _sede_id: string
          _servicios_externos_activos?: boolean
        }
        Returns: Json
      }
      guardar_detalles_cotizacion: {
        Args: { _cotizacion_id: string; _detalles: Json }
        Returns: undefined
      }
      guardar_respuestas_intento_formacion: {
        Args: {
          _intento_id: string
          _pregunta_actual?: number
          _respuestas: Json
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      iniciar_intento_formacion: { Args: { _examen_id: string }; Returns: Json }
      listar_operarios_por_area: {
        Args: { _sede_id: string }
        Returns: {
          areas: string[]
          id: string
          nombre: string
        }[]
      }
      listar_participantes_servicio: {
        Args: { _area?: string }
        Returns: {
          especialidad: string
          id: string
          nombre: string
          tipo_participante: string
        }[]
      }
      listar_respuestas_cotizacion: {
        Args: { _cotizacion_id: string }
        Returns: {
          accion: string
          comentario: string
          created_at: string
          id: string
        }[]
      }
      listar_servicios_externos_recibidos: {
        Args: never
        Returns: {
          area: string
          cantidad_piezas: number
          descripcion: string
          estado: string
          fecha_fin: string
          fecha_inicio: string
          fecha_planificada: string
          id: string
          material: string
          notas: string
          origen_participante_id: string
          origen_participante_nombre: string
          pedido_id: string
          pieza: string
          prioridad: string
          referencia_pedido: string
          titulo: string
        }[]
      }
      listar_talleres_para_compartir_mi_nube: {
        Args: never
        Returns: {
          id: string
          nombre: string
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
      mover_pedido_a_area: {
        Args: { _destino: string; _motivo?: string; _pedido_id: string }
        Returns: {
          area_desde: string
          destino: string
          estado: string
          reinicia_flujo: boolean
        }[]
      }
      normaliza_area: { Args: { _area: string }; Returns: string }
      obtener_actividad_comunidad_por_slug: {
        Args: { _slug: string }
        Returns: {
          activity_type: string
          actor_name: string
          created_at: string
          created_by: string | null
          dedupe_key: string | null
          id: string
          is_public: boolean
          metadata: Json
          participante_id: string | null
          summary: string | null
          target_url: string | null
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "aurum_community_activity"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      obtener_analitica_aurum_lab: { Args: { _dias?: number }; Returns: Json }
      obtener_carrusel_enlaces_catalogo_publico: {
        Args: { _slug: string }
        Returns: {
          enlaces_carrusel: Json
        }[]
      }
      obtener_catalogo_publico: {
        Args: { _slug: string }
        Returns: {
          acabado: string
          aurum_render_url: string
          categoria: string
          codigo: string
          coleccion_nombre: string
          coleccion_slug: string
          descripcion_producto: string
          descripcion_publica: string
          destacado: boolean
          disponibilidad: string
          ficha_tecnica_url: string
          galeria: Json
          imagen_principal_url: string
          logo_url: string
          medidas: string
          metal_principal: string
          moneda: string
          mostrar_ficha_tecnica: boolean
          mostrar_precio: boolean
          nombre: string
          nombre_publico: string
          peso_gramos: number
          piedras: string
          precio_desde: number
          producto_id: string
          producto_slug: string
          slug: string
          talla: string
          tecnica: string
          tiempo_fabricacion_dias: number
          video_url: string
          whatsapp: string
        }[]
      }
      obtener_configuracion_portada_publica: {
        Args: { _slug: string }
        Returns: {
          frase_portada: string
          imagenes_portada: Json
          intervalo_portada_segundos: number
        }[]
      }
      obtener_contacto_catalogo_publico: {
        Args: { _slug: string }
        Returns: Json
      }
      obtener_directorio_comunidad_publica: {
        Args: never
        Returns: {
          catalogo_visible: boolean
          descripcion: string
          formacion_descripcion: string
          formacion_titulo: string
          identidad_ciudad: string
          identidad_logo: string
          identidad_nombre: string
          identidad_pais: string
          identidad_sitio_web: string
          imagen_url: string
          nombre: string
          participante_id: string
          productos_destacados: Json
          productos_publicados: number
          slug: string
          tipo: string
        }[]
      }
      obtener_enlace_visor_3d: {
        Args: { _modelo_ruta: string; _nombre: string }
        Returns: {
          expira_en: string
          nombre: string
          token: string
        }[]
      }
      obtener_examen_formacion_alumno: {
        Args: { _examen_id: string }
        Returns: Json
      }
      obtener_examen_intento_formacion: {
        Args: { _intento_id: string }
        Returns: Json
      }
      obtener_ficha_servicio_externo: {
        Args: { _trabajo_id: string }
        Returns: Json
      }
      obtener_galeria_joyas_publica: {
        Args: never
        Returns: {
          catalogo_slug: string
          categoria: string
          descripcion: string
          destacado: boolean
          galeria: Json
          imagen_principal_url: string
          moneda: string
          nombre: string
          precio_desde: number
          producto_id: string
          taller: string
        }[]
      }
      obtener_marketplace_archivos_publico: {
        Args: never
        Returns: {
          archivo_id: string
          categoria: string
          creado_en: string
          descripcion: string
          formatos: string[]
          imagen_portada_url: string
          moneda: string
          nombre_vendedor: string
          precio: number
          titulo: string
        }[]
      }
      obtener_mis_compras_archivos: {
        Args: never
        Returns: {
          archivo_id: string
          compra_id: string
          creado_en: string
          estado_pago: string
          formatos: string[]
          moneda: string
          nombre_archivo: string
          precio_pagado: number
          titulo: string
        }[]
      }
      obtener_portadas_colecciones_publicas: {
        Args: { _slug: string }
        Returns: {
          coleccion_nombre: string
          coleccion_slug: string
          imagen_portada_url: string
        }[]
      }
      obtener_publicidad_formacion: {
        Args: { _slug: string }
        Returns: {
          descripcion: string
          formacion_descripcion: string
          formacion_imagen_url: string
          formacion_titulo: string
          logo_url: string
          nombre_publico: string
          slug: string
          whatsapp: string
        }[]
      }
      obtener_redes_sociales_catalogo_publico: {
        Args: { _slug: string }
        Returns: Json
      }
      obtener_texto_superior_portada_publica: {
        Args: { _slug: string }
        Returns: {
          texto_superior_portada: string
        }[]
      }
      obtener_trabajo_operativo: {
        Args: { _trabajo_id: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "trabajos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      preparar_produccion_pedido: {
        Args: { _pedido_id: string }
        Returns: Json
      }
      recalcular_costos_orden: { Args: { _orden_id: string }; Returns: Json }
      recibir_compra: { Args: { _compra_id: string }; Returns: Json }
      reconciliar_servicios_externos_pendientes: {
        Args: { _orden_produccion_id: string }
        Returns: Json
      }
      recuperar_respuestas_intento_formacion: {
        Args: { _intento_id: string }
        Returns: Json
      }
      registrar_entrega_material_produccion: {
        Args: {
          _area_destino: string
          _cantidad: number
          _material_id: string
          _notas?: string
          _orden_id: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "orden_produccion_entregas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_inspeccion_calidad: {
        Args: {
          _descripcion?: string
          _evidencia_url?: string
          _motivo?: string
          _orden_id: string
          _resultado: string
          _tipo?: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "control_calidad"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_movimiento_produccion: {
        Args: {
          _cantidad: number
          _material_id: string
          _motivo: string
          _orden_id: string
          _referencia_externa?: string
          _tipo: string
        }
        Returns: {
          area: string
          cantidad: number
          costo_unitario: number | null
          created_at: string
          id: string
          material_id: string
          motivo: string
          orden_produccion_id: string | null
          pedido_id: string | null
          referencia_externa: string
          stock_anterior: number
          stock_posterior: number
          tipo: string
          usuario_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "inventario_movimientos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      registrar_solicitud_catalogo: {
        Args: {
          _cantidad?: number
          _catalogo_slug: string
          _email?: string
          _mensaje?: string
          _nombre: string
          _producto_slug: string
          _telefono?: string
        }
        Returns: string
      }
      release_aurum_transfer: {
        Args: { _transfer_id: string }
        Returns: undefined
      }
      reparar_servicios_externos_op: {
        Args: { _orden_produccion_id: string }
        Returns: Json
      }
      resolver_enlace_visor_3d: {
        Args: { _token: string }
        Returns: {
          expira_en: string
          modelo_url: string
          nombre: string
        }[]
      }
      responder_cotizacion_cliente: {
        Args: { _accion: string; _codigo: string; _comentario?: string }
        Returns: Json
      }
      seguimiento_cotizacion: {
        Args: { _token: string }
        Returns: {
          anticipo: number
          cliente: string
          descuento: number
          detalles: Json
          especificaciones: Json
          estado: string
          fecha_emision: string
          fecha_entrega_solicitada: string
          fecha_vencimiento: string
          identidad_comercial: Json
          impuestos: number
          moneda: string
          notas_cliente: string
          numero: string
          sede: string
          subtotal: number
          total: number
          trabajo: string
          version: number
        }[]
      }
      seguimiento_cotizacion_codigo: {
        Args: { _codigo: string }
        Returns: {
          anticipo: number
          cliente: string
          descuento: number
          detalles: Json
          especificaciones: Json
          estado: string
          fecha_emision: string
          fecha_entrega_solicitada: string
          fecha_vencimiento: string
          identidad_comercial: Json
          impuestos: number
          moneda: string
          notas_cliente: string
          numero: string
          sede: string
          subtotal: number
          total: number
          trabajo: string
          version: number
        }[]
      }
      seguimiento_cotizacion_pdf_url: {
        Args: { _codigo: string }
        Returns: string
      }
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
      siguiente_numero_contrato: {
        Args: { _anio: number; _sede_id: string }
        Returns: string
      }
      siguiente_numero_cotizacion: {
        Args: { _anio: number; _sede_id: string }
        Returns: string
      }
      tiene_participante: {
        Args: { _participante_id: string; _user_id: string }
        Returns: boolean
      }
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
      verificar_pieza_terminada: {
        Args: { _nuevo_estado: string; _pieza_id: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "piezas_terminadas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      vincular_inscripciones_formacion: { Args: never; Returns: number }
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
