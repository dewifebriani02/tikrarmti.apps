import { createClient } from './supabase/client'
import { createSupabaseAdmin } from './supabase'

const supabaseAdmin = createSupabaseAdmin()
import type { Batch, BatchCreateRequest, BatchUpdateRequest, BatchEnrollment, BatchSession, BatchStatistics, ExtendedBatchFilter, EnrollmentApprovalRequest } from '@/types/batch'

export class BatchService {
  // Batch Management
  static async createBatch(batchData: BatchCreateRequest): Promise<string> {
    try {
      const { data, error } = await supabaseAdmin
        .from('batches')
        .insert({
          ...batchData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;
      console.log('Batch created:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating batch:', error);
      throw new Error('Gagal membuat batch baru');
    }
  }

  static async updateBatch(batchId: string, updateData: BatchUpdateRequest): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('batches')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId);

      if (error) throw error;
      console.log('Batch updated:', batchId);
    } catch (error) {
      console.error('Error updating batch:', error);
      throw new Error('Gagal mengupdate batch');
    }
  }

  static async deleteBatch(batchId: string): Promise<void> {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;
      console.log('Batch deleted:', batchId);
    } catch (error) {
      console.error('Error deleting batch:', error);
      throw new Error('Gagal menghapus batch');
    }
  }

  static async getBatch(batchId: string): Promise<Batch | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No rows returned
        }
        throw error;
      }

      return data as Batch;
    } catch (error) {
      console.error('Error getting batch:', error);
      throw new Error('Gagal mengambil data batch');
    }
  }

  static async getBatches(filter?: ExtendedBatchFilter): Promise<Batch[]> {
    try {
      const supabase = createClient();
      let query = supabase.from('batches').select('*') as any;

      if (filter) {
        if (filter.status && filter.status.length > 0) {
          query = query.in('status', filter.status);
        }

        if (filter.targetJuz && filter.targetJuz.length > 0) {
          query = query.contains('target_juz', filter.targetJuz);
        }

        if (filter.dateRange) {
          query = query
            .gte('start_date', filter.dateRange.start)
            .lte('start_date', filter.dateRange.end);
        }

        if (filter.search) {
          query = query.ilike('name', `%${filter.search}%`);
        }
      }

      const { data, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Batch[];
    } catch (error) {
      console.error('Error getting batches:', error);
      throw new Error('Gagal mengambil data batch');
    }
  }

  static async getBatchStatistics(batchId: string): Promise<BatchStatistics | null> {
    try {
      const supabase = createClient();
      // Get all enrollments for this batch
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('batch_enrollments')
        .select('*')
        .eq('batch_id', batchId) as any;

      if (enrollmentError) throw enrollmentError;

      // Calculate statistics
      const totalEnrollments = enrollments?.length || 0;
      const activeEnrollments = enrollments?.filter((e: any) =>
        ['pending', 'approved', 'selected', 'active'].includes(e.status)
      ).length || 0;
      const completedEnrollments = enrollments?.filter((e: any) =>
        ['completed', 'graduated'].includes(e.status)
      ).length || 0;
      const droppedEnrollments = enrollments?.filter((e: any) =>
        ['dropped'].includes(e.status)
      ).length || 0;

      // Calculate graduation rate
      const graduationRate = completedEnrollments > 0
        ? (completedEnrollments / (completedEnrollments + droppedEnrollments)) * 100
        : 0;

      // Calculate average attendance
      const attendanceRates = enrollments?.map((e: any) => e.attendance?.attendance_rate || 0) || [];
      const averageAttendance = attendanceRates.length > 0
        ? attendanceRates.reduce((sum: any, rate: any) => sum + rate, 0) / attendanceRates.length
        : 0;

      return {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        droppedEnrollments,
        graduationRate,
        averageAttendance,
        averagePerformance: 0, // Could be calculated from performance data
        performance: {
          completionRates: {
            overall: graduationRate,
            byWeek: {} // Could be calculated from session data
          },
          attendanceRates: {
            overall: averageAttendance,
            byWeek: {} // Could be calculated from session data
          },
          dropoutReasons: {} // Could be calculated from enrollment data
        },
        demographics: {
          ageGroups: {
            '17-20': 0,
            '21-25': 0,
            '26-30': 0,
            '31+': 0
          },
          domicile: {
            jakarta: 0,
            bandung: 0,
            surabaya: 0,
            other: 0
          },
          timezones: {}
        },
        enrollmentTrends: {
          weekly: [],
          monthly: []
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error calculating batch statistics:', error);
      throw new Error('Gagal menghitung statistik batch');
    }
  }

  // Enrollment Management
  static async createEnrollment(enrollmentData: Omit<BatchEnrollment, 'id' | 'created_at'>): Promise<string> {
    try {
      const { data, error } = await supabaseAdmin
        .from('batch_enrollments')
        .insert({
          ...enrollmentData,
          enrollment_date: new Date().toISOString(),
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      console.log('Enrollment created:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating enrollment:', error);
      throw new Error('Gagal membuat pendaftaran');
    }
  }

  static async updateEnrollment(enrollmentId: string, updateData: Partial<BatchEnrollment>): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('batch_enrollments')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (error) throw error;
      console.log('Enrollment updated:', enrollmentId);
    } catch (error) {
      console.error('Error updating enrollment:', error);
      throw new Error('Gagal mengupdate pendaftaran');
    }
  }

  static async approveEnrollment(enrollmentId: string, approvalData: EnrollmentApprovalRequest): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('batch_enrollments')
        .update({
          ...approvalData,
          status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (error) throw error;
      console.log('Enrollment approved:', enrollmentId);
    } catch (error) {
      console.error('Error approving enrollment:', error);
      throw new Error('Gagal menyetujui pendaftaran');
    }
  }

  static async rejectEnrollment(enrollmentId: string, rejectionData: EnrollmentApprovalRequest): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('batch_enrollments')
        .update({
          ...rejectionData,
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', enrollmentId);

      if (error) throw error;
      console.log('Enrollment rejected:', enrollmentId);
    } catch (error) {
      console.error('Error rejecting enrollment:', error);
      throw new Error('Gagal menolak pendaftaran');
    }
  }

  static async getEnrollments(batchId?: string): Promise<BatchEnrollment[]> {
    try {
      const supabase = createClient();
      let query = supabase.from('batch_enrollments').select('*') as any;

      if (batchId) {
        query = query.eq('batch_id', batchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BatchEnrollment[];
    } catch (error) {
      console.error('Error getting enrollments:', error);
      throw new Error('Gagal mengambil data pendaftaran');
    }
  }

  // Session Management
  static async createSession(sessionData: Omit<BatchSession, 'id' | 'created_at'>): Promise<string> {
    try {
      const { data, error } = await supabaseAdmin
        .from('batch_sessions')
        .insert({
          ...sessionData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      console.log('Session created:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Gagal membuat sesi');
    }
  }

  static async updateSession(sessionId: string, updateData: Partial<BatchSession>): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('batch_sessions')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
      console.log('Session updated:', sessionId);
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error('Gagal mengupdate sesi');
    }
  }

  static async getSessions(batchId: string): Promise<BatchSession[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('batch_sessions')
        .select('*')
        .eq('batch_id', batchId)
        .order('session_date', { ascending: true });

      if (error) throw error;
      return data as BatchSession[];
    } catch (error) {
      console.error('Error getting sessions:', error);
      throw new Error('Gagal mengambil data sesi');
    }
  }

  // Utility Functions
  static async getActiveBatches(): Promise<Batch[]> {
    return this.getBatches({ status: ['ongoing', 'open'] });
  }

  static async getEnrollmentTrends(batchId: string, months: number = 6): Promise<BatchStatistics['enrollmentTrends']> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - months + 1);

      const supabase = createClient();
      const { data: enrollments, error } = await supabase
        .from('batch_enrollments')
        .select('*')
        .eq('batch_id', batchId)
        .gte('enrollment_date', startDate.toISOString())
        .lte('enrollment_date', endDate.toISOString());

      if (error) throw error;

      const monthlyTrends = [];
      for (let i = 0; i < months; i++) {
        const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const nextMonthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 1);

        const monthEnrollments = enrollments?.filter((doc: any) => {
          const enrollmentDate = new Date(doc.enrollment_date);
          return enrollmentDate >= monthDate && enrollmentDate < nextMonthDate;
        }).length || 0;

        const monthCompletions = enrollments?.filter((doc: any) => {
          const enrollment = doc;
          return ['completed', 'graduated'].includes(enrollment.status);
        }).length || 0;

        monthlyTrends.push({
          month: monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }),
          enrollments: monthEnrollments,
          completions: monthCompletions
        });
      }

      return {
        weekly: [],
        monthly: monthlyTrends
      };
    } catch (error) {
      console.error('Error getting enrollment trends:', error);
      throw new Error('Gagal mengambil data tren pendaftaran');
    }
  }
}