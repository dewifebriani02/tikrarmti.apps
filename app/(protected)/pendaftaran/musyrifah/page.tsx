'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRegistrationBatch } from '@/hooks/useBatches';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Users, UserCheck, ShieldCheck, Heart, Target, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';

const musyrifahSchema = z.object({
  // Personal Information
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  birth_date: z.string().min(1, 'Tanggal lahir harus diisi'),
  birth_place: z.string().min(3, 'Tempat lahir minimal 3 karakter'),
  address: z.string().min(10, 'Alamat minimal 10 karakter'),
  whatsapp: z.string().min(10, 'Nomor WhatsApp minimal 10 karakter'),
  email: z.string().email('Email tidak valid'),
  education: z.string().min(1, 'Pendidikan terakhir harus dipilih'),
  occupation: z.string().min(3, 'Pekerjaan minimal 3 karakter'),

  // Leadership Experience
  leadership_experience: z.string().min(1, 'Pengalaman leadership harus dipilih'),
  leadership_years: z.string().optional(),
  leadership_roles: z.string().optional(),

  // Management Skills
  management_skills: z.array(z.string()).min(1, 'Pilih minimal 1 skill manajemen'),
  team_management_experience: z.string().min(1, 'Pengalaman manajemen tim harus dipilih'),

  // Schedule Preference
  preferred_schedule: z.string().min(1, 'Jadwal yang diinginkan harus dipilih'),
  backup_schedule: z.string().min(1, 'Jadwal cadangan harus dipilih'),
  timezone: z.string().min(1, 'Zona waktu harus dipilih'),

  // Commitment
  time_commitment: z.boolean().refine(val => val === true, 'Komitmen waktu harus disetujui'),
  understands_program: z.boolean().refine(val => val === true, 'Pemahaman program harus disetujui'),
  agreement: z.boolean().refine(val => val === true, 'Pernyataan persetujuan harus dicentang'),

  // Additional Information
  motivation: z.string().optional(),
  leadership_philosophy: z.string().optional(),
  special_achievements: z.string().optional(),
});

type MusyrifahFormData = z.infer<typeof musyrifahSchema>;

const educationOptions = [
  { value: 'sma', label: 'SMA/Sederajat' },
  { value: 'd1', label: 'D1' },
  { value: 'd2', label: 'D2' },
  { value: 'd3', label: 'D3' },
  { value: 's1', label: 'S1' },
  { value: 's2', label: 'S2' },
  { value: 's3', label: 'S3' },
];

const leadershipExperienceOptions = [
  { value: 'none', label: 'Belum pernah memiliki pengalaman' },
  { value: 'student_org', label: 'Organisasi siswa/mahasiswa' },
  { value: 'community_org', label: 'Organisasi masyarakat' },
  { value: 'professional_org', label: 'Organisasi profesional' },
  { value: 'team_lead', label: 'Team Leader/Supervisor' },
  { value: 'manager', label: 'Manager/Department Head' },
  { value: 'director', label: 'Director/Executive Level' },
];

const managementSkillsOptions = [
  { value: 'planning', label: 'Perencanaan Strategis' },
  { value: 'team_building', label: 'Team Building' },
  { value: 'conflict_resolution', label: 'Resolusi Konflik' },
  { value: 'communication', label: 'Komunikasi Efektif' },
  { value: 'time_management', label: 'Manajemen Waktu' },
  { value: 'decision_making', label: 'Pengambilan Keputusan' },
  { value: 'coaching', label: 'Coaching & Mentoring' },
  { value: 'project_management', label: 'Manajemen Proyek' },
  { value: 'budget_management', label: 'Manajemen Anggaran' },
  { value: 'performance_evaluation', label: 'Evaluasi Kinerja' },
];

const teamManagementOptions = [
  { value: 'none', label: 'Belum pernah memimpin tim' },
  { value: 'small_team', label: 'Tim kecil (3-5 orang)' },
  { value: 'medium_team', label: 'Tim sedang (6-15 orang)' },
  { value: 'large_team', label: 'Tim besar (15+ orang)' },
  { value: 'multiple_teams', label: 'Beberapa tim sekaligus' },
];

const scheduleOptions = [
  { value: 'morning', label: 'Pagi (06:00 - 12:00)' },
  { value: 'afternoon', label: 'Siang (12:00 - 15:00)' },
  { value: 'evening', label: 'Sore (15:00 - 18:00)' },
  { value: 'night', label: 'Malam (18:00 - 21:00)' },
];

const timezoneOptions = [
  { value: 'WIB', label: 'WIB (GMT+7)' },
  { value: 'WITA', label: 'WITA (GMT+8)' },
  { value: 'WIT', label: 'WIT (GMT+9)' },
];

function MusyrifahRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [batchId, setBatchId] = useState<string>('');
  const { registrationBatch, isLoading: activeBatchLoading } = useRegistrationBatch();
  const [batchInfo, setBatchInfo] = useState<any>(null);

  // Check if user is an alumnus and has not filled in their testimonial
  useEffect(() => {
    async function checkAlumniStatus() {
      try {
        const res = await fetch('/api/alumni/testimonial/my');
        if (res.ok) {
          const data = await res.json();
          if (data.isAlumni && !data.testimonial) {
            toast.error('Afwan Ukhti, Ukhti harus mengisi testimoni alumni terlebih dahulu.');
            router.push('/alumni');
          }
        }
      } catch (err) {
        console.error('Error checking alumni status:', err);
      }
    }
    if (user) {
      checkAlumniStatus();
    }
  }, [user, router]);

  const [formData, setFormData] = useState<MusyrifahFormData>({
    // Personal Information
    full_name: '',
    birth_date: '',
    birth_place: '',
    address: '',
    whatsapp: '',
    email: '',
    education: '',
    occupation: '',

    // Leadership Experience
    leadership_experience: '',
    leadership_years: '',
    leadership_roles: '',

    // Management Skills
    management_skills: [],
    team_management_experience: '',

    // Schedule Preference
    preferred_schedule: '',
    backup_schedule: '',
    timezone: 'WIB',

    // Commitment
    time_commitment: false,
    understands_program: false,
    agreement: false,

    // Additional Information
    motivation: '',
    leadership_philosophy: '',
    special_achievements: '',
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const batch = searchParams.get('batchId') || searchParams.get('batch');
    if (batch) {
      setBatchId(batch);
      fetchBatchInfo(batch);
    } else if (registrationBatch?.id && !batchId) {
      setBatchId(registrationBatch.id);
      setBatchInfo(registrationBatch);
    }
  }, [searchParams, registrationBatch]);

  const fetchBatchInfo = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setBatchInfo(data);
    } catch (error) {
      console.error('Error fetching batch info:', error);
      toast.error('Gagal memuat informasi batch');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSkillToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      management_skills: prev.management_skills.includes(skill)
        ? prev.management_skills.filter(s => s !== skill)
        : [...prev.management_skills, skill]
    }));
  };

  const validateStep = (step: number) => {
    try {
      let stepData: any = {};

      switch (step) {
        case 1:
          stepData = {
            full_name: formData.full_name,
            birth_date: formData.birth_date,
            birth_place: formData.birth_place,
            address: formData.address,
            whatsapp: formData.whatsapp,
            email: formData.email,
            education: formData.education,
            occupation: formData.occupation,
          };
          break;
        case 2:
          stepData = {
            leadership_experience: formData.leadership_experience,
            leadership_years: formData.leadership_experience !== 'none' ? formData.leadership_years : undefined,
            leadership_roles: formData.leadership_experience !== 'none' ? formData.leadership_roles : undefined,
            management_skills: formData.management_skills,
            team_management_experience: formData.team_management_experience,
          };
          break;
        case 3:
          stepData = {
            preferred_schedule: formData.preferred_schedule,
            backup_schedule: formData.backup_schedule,
            timezone: formData.timezone,
          };
          break;
      }

      // Validate only the current step's required fields
      Object.entries(stepData).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length === 0) {
          throw new Error(`${key} cannot be empty`);
        }
        if (typeof value === 'string' && !value.trim()) {
          throw new Error(`${key} is required`);
        }
      });

      return true;
    } catch (error) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchId) {
      toast.error('Batch ID tidak ditemukan');
      return;
    }

    // Validate all data
    try {
      musyrifahSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach(err => {
          const field = err.path[0];
          if (typeof field === 'string') {
            newErrors[field] = err.message;
          }
        });
        setErrors(newErrors);
        toast.error('Mohon perbaiki error pada form');
      }
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Use user from useAuth() hook (server-provided data via layout)
      // This follows arsitektur.md: NO client-side auth checks
      if (!user) {
        toast.error('Sesi tidak valid. Silakan login kembali.');
        router.push('/login');
        return;
      }

      // Submit musyrifah registration data
      const { error: submitError } = await supabase
        .from('musyrifah_registrations')
        .insert({
          user_id: user.id,
          batch_id: batchId,
          full_name: formData.full_name,
          birth_date: formData.birth_date,
          birth_place: formData.birth_place,
          address: formData.address,
          whatsapp: formData.whatsapp,
          email: formData.email,
          education: formData.education,
          occupation: formData.occupation,
          leadership_experience: formData.leadership_experience,
          leadership_years: formData.leadership_years,
          leadership_roles: formData.leadership_roles,
          management_skills: formData.management_skills,
          team_management_experience: formData.team_management_experience,
          preferred_schedule: formData.preferred_schedule,
          backup_schedule: formData.backup_schedule,
          timezone: formData.timezone,
          motivation: formData.motivation,
          leadership_philosophy: formData.leadership_philosophy,
          special_achievements: formData.special_achievements,
          status: 'pending',
          submitted_at: new Date().toISOString(),
        });

      if (submitError) throw submitError;

      toast.success('Pendaftaran sebagai Musyrifah berhasil dikirim!');
      router.push('/dashboard');

    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Gagal mengirim pendaftaran');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Informasi Personal</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nama Lengkap *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className={errors.full_name ? 'border-red-500' : ''}
                  />
                  {errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp *</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className={errors.whatsapp ? 'border-red-500' : ''}
                  />
                  {errors.whatsapp && <p className="text-sm text-red-500">{errors.whatsapp}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_place">Tempat Lahir *</Label>
                  <Input
                    id="birth_place"
                    value={formData.birth_place}
                    onChange={(e) => handleInputChange('birth_place', e.target.value)}
                    placeholder="Kota kelahiran"
                    className={errors.birth_place ? 'border-red-500' : ''}
                  />
                  {errors.birth_place && <p className="text-sm text-red-500">{errors.birth_place}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Tanggal Lahir *</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleInputChange('birth_date', e.target.value)}
                    className={errors.birth_date ? 'border-red-500' : ''}
                  />
                  {errors.birth_date && <p className="text-sm text-red-500">{errors.birth_date}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="education">Pendidikan Terakhir *</Label>
                  <Select value={formData.education} onValueChange={(value) => handleInputChange('education', value)}>
                    <SelectTrigger className={errors.education ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih pendidikan" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.education && <p className="text-sm text-red-500">{errors.education}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Pekerjaan *</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => handleInputChange('occupation', e.target.value)}
                    placeholder="Pekerjaan saat ini"
                    className={errors.occupation ? 'border-red-500' : ''}
                  />
                  {errors.occupation && <p className="text-sm text-red-500">{errors.occupation}</p>}
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="address">Alamat Lengkap *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Masukkan alamat lengkap"
                  rows={3}
                  className={errors.address ? 'border-red-500' : ''}
                />
                {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Pengalaman Leadership & Manajemen</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Pengalaman Leadership *</Label>
                  <Select value={formData.leadership_experience} onValueChange={(value) => handleInputChange('leadership_experience', value)}>
                    <SelectTrigger className={errors.leadership_experience ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih pengalaman leadership" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadershipExperienceOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.leadership_experience && <p className="text-sm text-red-500">{errors.leadership_experience}</p>}
                </div>

                {formData.leadership_experience && formData.leadership_experience !== 'none' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="leadership_years">Berapa Tahun Pengalaman?</Label>
                      <Input
                        id="leadership_years"
                        value={formData.leadership_years}
                        onChange={(e) => handleInputChange('leadership_years', e.target.value)}
                        placeholder="Contoh: 3 tahun"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leadership_roles">Posisi/Jabatan yang Pernah Diemban</Label>
                      <Textarea
                        id="leadership_roles"
                        value={formData.leadership_roles}
                        onChange={(e) => handleInputChange('leadership_roles', e.target.value)}
                        placeholder="Sebutkan posisi atau jabatan leadership yang pernah diemban"
                        rows={2}
                      />
                    </div>
                  </>
                )}

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Skill Manajemen yang Dimiliki *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {managementSkillsOptions.map(option => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={option.value}
                            checked={formData.management_skills.includes(option.value)}
                            onCheckedChange={() => handleSkillToggle(option.value)}
                          />
                          <Label htmlFor={option.value} className="text-sm">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Pengalaman Manajemen Tim *</Label>
                    <Select value={formData.team_management_experience} onValueChange={(value) => handleInputChange('team_management_experience', value)}>
                      <SelectTrigger className={errors.team_management_experience ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Pilih pengalaman manajemen tim" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamManagementOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.team_management_experience && <p className="text-sm text-red-500">{errors.team_management_experience}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Preferensi Jadwal & Ketersediaan</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Jadwal Utama yang Diinginkan *</Label>
                  <Select value={formData.preferred_schedule} onValueChange={(value) => handleInputChange('preferred_schedule', value)}>
                    <SelectTrigger className={errors.preferred_schedule ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih jadwal utama" />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.preferred_schedule && <p className="text-sm text-red-500">{errors.preferred_schedule}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Jadwal Cadangan *</Label>
                  <Select value={formData.backup_schedule} onValueChange={(value) => handleInputChange('backup_schedule', value)}>
                    <SelectTrigger className={errors.backup_schedule ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Pilih jadwal cadangan" />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.backup_schedule && <p className="text-sm text-red-500">{errors.backup_schedule}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Zona Waktu *</Label>
                  <Select value={formData.timezone} onValueChange={(value) => handleInputChange('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezoneOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Informasi Tambahan & Komitmen</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="motivation">Motivasi Menjadi Musyrifah</Label>
                  <Textarea
                    id="motivation"
                    value={formData.motivation}
                    onChange={(e) => handleInputChange('motivation', e.target.value)}
                    placeholder="Ceritakan motivasi <em>Ukhti</em> ingin menjadi musyrifah di MTI"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadership_philosophy">Filosofi Leadership</Label>
                  <Textarea
                    id="leadership_philosophy"
                    value={formData.leadership_philosophy}
                    onChange={(e) => handleInputChange('leadership_philosophy', e.target.value)}
                    placeholder="Bagikan pandangan <em>Ukhti</em> tentang kepemimpinan yang efektif"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special_achievements">Pencapaian Khusus</Label>
                  <Textarea
                    id="special_achievements"
                    value={formData.special_achievements}
                    onChange={(e) => handleInputChange('special_achievements', e.target.value)}
                    placeholder="Sebutkan pencapaian atau penghargaan yang relevan"
                    rows={3}
                  />
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="time_commitment"
                      checked={formData.time_commitment}
                      onCheckedChange={(checked) => handleInputChange('time_commitment', checked)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="time_commitment" className="font-medium">
                        Komitmen Waktu
                      </Label>
                      <p className="text-sm text-gray-600">
                        Saya bersedia meluangkan waktu minimal 15 jam/minggu untuk tugas musyrifah dan pembinaan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="understands_program"
                      checked={formData.understands_program}
                      onCheckedChange={(checked) => handleInputChange('understands_program', checked)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="understands_program" className="font-medium">
                        Pemahaman Program
                      </Label>
                      <p className="text-sm text-gray-600">
                        Saya memahami bahwa musyrifah adalah pendamping muallimah dan membutuhkan kemampuan interpersonal yang baik
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agreement"
                      checked={formData.agreement}
                      onCheckedChange={(checked) => handleInputChange('agreement', checked)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="agreement" className="font-medium">
                        Pernyataan Persetujuan
                      </Label>
                      <p className="text-sm text-gray-600">
                        Saya menyatakan bahwa semua informasi yang saya berikan adalah benar dan dapat dipertanggungjawabkan
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Auth check - show loading or redirect */}
      {authLoading ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Memeriksa autentikasi...</p>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Mengalihkan ke halaman login...</p>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/pendaftaran" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
              ← Kembali ke Program
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Pendaftaran Program Musyrifah
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Bergabunglah menjadi musyrifah profesional yang akan membantu muallimah dalam melaksanakan tugas pendidikan
            </p>
          </div>

          {/* Batch Info */}
          {batchInfo && (
            <Alert className="mb-6">
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <strong>{batchInfo.name}</strong> •
                {new Date(batchInfo.start_date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })} - {new Date(batchInfo.end_date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}
              </AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 4 && (
                    <div
                      className={`w-full h-1 mx-2 ${
                        currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Data Personal</span>
              <span>Leadership</span>
              <span>Jadwal</span>
              <span>Komitmen</span>
            </div>
          </div>

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                Formulir Pendaftaran Musyrifah
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "Lengkapi informasi personal <em>Ukhti</em>"}
                {currentStep === 2 && "Pengalaman leadership dan kemampuan manajemen"}
                {currentStep === 3 && "Preferensi jadwal dan ketersediaan"}
                {currentStep === 4 && "Informasi tambahan dan pernyataan komitmen"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {renderStepContent()}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                  >
                    Sebelumnya
                  </Button>

                  {currentStep < 4 ? (
                    <Button type="button" onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">
                      Selanjutnya
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? 'Mengirim...' : 'Kirim Pendaftaran'}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Program Benefits */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Benefit Program Musyrifah
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-700">🎓 Training & Development</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Training manajerial dan kepemimpinan</li>
                    <li>• Metode pembinaan thalibah modern</li>
                    <li>• Sertifikasi musyrifah profesional</li>
                    <li>• Program leadership development</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-blue-700">💼 Karir & Networking</h4>
                  <ul className="text-sm space-y-1 text-gray-600">
                    <li>• Peluang karir di berbagai lembaga</li>
                    <li>• Networking dengan praktisi pendidikan</li>
                    <li>• Magang di tingkat manajemen MTI</li>
                    <li>• Program study tour ke lembaga terkemuka</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      )}
    </>
  );
}

export default function MusyrifahRegistrationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <MusyrifahRegistrationContent />
    </Suspense>
  );
}