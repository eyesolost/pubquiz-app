export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          name: string
          date: string
          description: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          date?: string
          description?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          date?: string
          description?: string | null
          status?: string
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          game_id: string | null
          name: string
          members_count: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id?: string | null
          name: string
          members_count: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string | null
          name?: string
          members_count?: number
          created_at?: string
        }
      }
      rounds: {
        Row: {
          id: string
          game_id: string | null
          round_number: number
          category: string
          status: string
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          game_id?: string | null
          round_number: number
          category: string
          status?: string
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string | null
          round_number?: number
          category?: string
          status?: string
          completed_at?: string | null
          created_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          round_id: string
          question_number: number
          question_text: string
          updated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          round_id: string
          question_number: number
          question_text: string
          updated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          question_number?: number
          question_text?: string
          updated_at?: string | null
          created_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          question_id: string
          team_id: string
          answer_text: string
          points: number | null
          evaluated: boolean
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          team_id: string
          answer_text: string
          points?: number | null
          evaluated?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          team_id?: string
          answer_text?: string
          points?: number | null
          evaluated?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}