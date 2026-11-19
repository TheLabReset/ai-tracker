
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "tracker": {
          Tables: {
            "admins": {
                  Row: {
                    "correo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "correo": string
                  }
                  Update: {
                    "correo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"alias": {
                  Row: {
                    "ambiguo": boolean,"clave": string,"id": string,"marca_id": string,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ambiguo"?: boolean,"clave": string,"id"?: string,"marca_id": string,"texto": string
                  }
                  Update: {
                    "ambiguo"?: boolean,"clave"?: string,"id"?: string,"marca_id"?: string,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alias_marca_id_fkey"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    }
                  ]
                },"empresas": {
                  Row: {
                    "dominio": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dominio": string,"id": string
                  }
                  Update: {
                    "dominio"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"marcas": {
                  Row: {
                    "ambiguo": boolean,"clave": string,"dominios": (string)[],"empresa_id": string | null,"es_cliente": boolean,"id": string,"nombre": string,"sector_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ambiguo"?: boolean,"clave": string,"dominios"?: (string)[],"empresa_id"?: string | null,"es_cliente"?: boolean,"id"?: string,"nombre": string,"sector_id": string
                  }
                  Update: {
                    "ambiguo"?: boolean,"clave"?: string,"dominios"?: (string)[],"empresa_id"?: string | null,"es_cliente"?: boolean,"id"?: string,"nombre"?: string,"sector_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "marcas_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "marcas_sector_id_fkey"
      columns: ["sector_id"]
isOneToOne: false
      referencedRelation: "sectores"
      referencedColumns: ["id"]
    }
                  ]
                },"membresias": {
                  Row: {
                    "marca_id": string,"rol": string,"usuario_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "marca_id": string,"rol": string,"usuario_id": string
                  }
                  Update: {
                    "marca_id"?: string,"rol"?: string,"usuario_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "membresias_marca_fk"
      columns: ["marca_id"]
isOneToOne: false
      referencedRelation: "marcas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "membresias_usuario_id_fkey"
      columns: ["usuario_id"]
isOneToOne: false
      referencedRelation: "usuarios"
      referencedColumns: ["id"]
    }
                  ]
                },"motores": {
                  Row: {
                    "activo": boolean,"busqueda_web": boolean,"codigo": string,"costo_estimado": number | null,"id": string,"modelo": string | null,"nombre": string,"orden": number,"parametros": NonNullable<Json>,"proveedor": string,"vigente_desde": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activo"?: boolean,"busqueda_web"?: boolean,"codigo": string,"costo_estimado"?: number | null,"id"?: string,"modelo"?: string | null,"nombre": string,"orden": number,"parametros"?: NonNullable<Json>,"proveedor": string,"vigente_desde"?: string
                  }
                  Update: {
                    "activo"?: boolean,"busqueda_web"?: boolean,"codigo"?: string,"costo_estimado"?: number | null,"id"?: string,"modelo"?: string | null,"nombre"?: string,"orden"?: number,"parametros"?: NonNullable<Json>,"proveedor"?: string,"vigente_desde"?: string
                  }
                  Relationships: [
                    
                  ]
                },"motores_historial": {
                  Row: {
                    "busqueda_web": boolean,"cambiado_por": string | null,"id": string,"modelo": string | null,"motor_id": string,"parametros": NonNullable<Json>,"vigente_hasta": string
                  }
                  ComputedFields: never
                  Insert: {
                    "busqueda_web": boolean,"cambiado_por"?: string | null,"id"?: string,"modelo"?: string | null,"motor_id": string,"parametros": NonNullable<Json>,"vigente_hasta": string
                  }
                  Update: {
                    "busqueda_web"?: boolean,"cambiado_por"?: string | null,"id"?: string,"modelo"?: string | null,"motor_id"?: string,"parametros"?: NonNullable<Json>,"vigente_hasta"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "motores_historial_motor_id_fkey"
      columns: ["motor_id"]
isOneToOne: false
      referencedRelation: "motores"
      referencedColumns: ["id"]
    }
                  ]
                },"sectores": {
                  Row: {
                    "categoria": string,"id": string,"idioma": string,"nombre": string,"pais": string
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria": string,"id"?: string,"idioma"?: string,"nombre": string,"pais"?: string
                  }
                  Update: {
                    "categoria"?: string,"id"?: string,"idioma"?: string,"nombre"?: string,"pais"?: string
                  }
                  Relationships: [
                    
                  ]
                },"usuarios": {
                  Row: {
                    "correo": string,"empresa_id": string,"es_admin": boolean,"id": string,"nombre": string
                  }
                  ComputedFields: never
                  Insert: {
                    "correo": string,"empresa_id": string,"es_admin"?: boolean,"id": string,"nombre": string
                  }
                  Update: {
                    "correo"?: string,"empresa_id"?: string,"es_admin"?: boolean,"id"?: string,"nombre"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "usuarios_empresa_id_fkey"
      columns: ["empresa_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "cambiar_admin":
{ Args: { "usuario": string,"valor": boolean }; Returns: undefined
                           },
"clave":
{ Args: { "t": string }; Returns: string
                           },
"crear_marca":
{ Args: { "datos": Json,"sector": string }; Returns: string
                           },
"es_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"es_correo_permitido":
{ Args: { "correo": string }; Returns: boolean
                           },
"es_usuario":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"perfil_de":
{ Args: { "usuario": string }; Returns: Json
                           },
"puede_ampliar_catalogo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"puede_editar_marca":
{ Args: { "marca": string }; Returns: boolean
                           },
"puede_ver_marca":
{ Args: { "marca": string }; Returns: boolean
                           },
"rol_en_marca":
{ Args: { "marca": string }; Returns: string
                           },
"sincronizar_perfil":
{ Args: Record<PropertyKey, never>; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "tracker">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "tracker": {
          Enums: {
            
          }
        }
} as const
