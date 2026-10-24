'use client';

import { useState } from 'react';
import type { User, UserRole } from '@/types';
import { registerWithEmail } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Globe,
  MessageSquare,
  Save,
  X,
  AlertCircle,
  Plus
} from 'lucide-react';

interface UserCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newUser: User) => void;
}

const userRoles: UserRole[] = [
  'admin',
  'thalibah',
];

const indonesianCities = [
  'Jakarta',
  'Surabaya',
  'Bandung',
  'Medan',
  'Semarang',
  'Makassar',
  'Palembang',
  'Tangerang',
  'Depok',
  'Batam',
  'Pekanbaru',
  'Bandar Lampung',
  'Malang',
  'Yogyakarta',
  'Samarinda',
  'Tasikmalaya',
  'Bogor',
  'Balikpapan',
  'Pontianak',
  'Banjarmasin',
  'Denpasar',
  'Padang',
  'Manado',
  'Mataram',
  'Kupang',
  'Jayapura',
  'Ambon',
  'Ternate',
  'Kendari',
  'Sorong',
  'Palu',
  'Lhokseumawe',
  'Jambi',
  'Banda Aceh',
  'Pekalongan',
  'Cirebon',
  'Bengkulu',
  'Purwokerto',
  'Solo',
  'Tegal',
  'Probolinggo',
  'Madiun',
  'Kediri',
  'Malang',
  'Blitar',
  'Kediri'
];

export default function UserCreateModal({
  isOpen,
  onClose,
  onSave
}: UserCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'thalibah' as UserRole,
    phone: '',
    personalInfo: {
      fullName: '',
      nickname: '',
      birthDate: '',
      address: '',
      city: '',
      province: '',
      whatsapp: '',
      telegram: '',
      timezone: 'Asia/Jakarta'
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('personalInfo.')) {
      const personalField = field.replace('personalInfo.', '');
      setFormData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          [personalField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password) {
      setError('Nama, email, dan password harus diisi');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password minimal 8 karakter');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Format email tidak valid');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const authResponse = await registerWithEmail(
        formData.email,
        formData.password,
        formData.name,
        formData.role
      );

      if (authResponse?.user) {
        // Fetch the user profile from our database
        const { getUserById } = await import('@/lib/auth');
        const userProfile = await getUserById(authResponse.user.id);

        if (userProfile) {
          onSave(userProfile);
          setSuccess('Pengguna berhasil dibuat!');
        } else {
          setError('Pengguna dibuat tapi gagal mengambil data profil');
        }
      } else {
        setError('Gagal membuat pengguna');
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'thalibah',
        phone: '',
        personalInfo: {
          fullName: '',
          nickname: '',
          birthDate: '',
          address: '',
          city: '',
          province: '',
          whatsapp: '',
          telegram: '',
          timezone: 'Asia/Jakarta'
        }
      });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat pengguna baru');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'thalibah',
      phone: '',
      personalInfo: {
        fullName: '',
        nickname: '',
        birthDate: '',
        address: '',
        city: '',
        province: '',
        whatsapp: '',
        telegram: '',
        timezone: 'Asia/Jakarta'
      }
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Tambah Pengguna Baru</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error and Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-green-600" />
              Informasi Dasar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center space-x-1">
                  <UserIcon className="w-4 h-4" />
                  <span>Nama Lengkap *</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center space-x-1">
                  <Mail className="w-4 h-4" />
                  <span>Email *</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Masukkan email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Masukkan password (minimal 8 karakter)"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Konfirmasi password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value as UserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span>No Telepon</span>
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Masukkan no telepon"
                />
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
              Informasi Pribadi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap (Sesuai KTP)</Label>
                <Input
                  id="fullName"
                  value={formData.personalInfo.fullName}
                  onChange={(e) => handleInputChange('personalInfo.fullName', e.target.value)}
                  placeholder="Masukkan nama lengkap sesuai KTP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">Nama Panggilan</Label>
                <Input
                  id="nickname"
                  value={formData.personalInfo.nickname}
                  onChange={(e) => handleInputChange('personalInfo.nickname', e.target.value)}
                  placeholder="Masukkan nama panggilan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate" className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Tanggal Lahir</span>
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.personalInfo.birthDate}
                  onChange={(e) => handleInputChange('personalInfo.birthDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="flex items-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span>No WhatsApp</span>
                </Label>
                <Input
                  id="whatsapp"
                  value={formData.personalInfo.whatsapp}
                  onChange={(e) => handleInputChange('personalInfo.whatsapp', e.target.value)}
                  placeholder="Masukkan no WhatsApp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram" className="flex items-center space-x-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>Telegram</span>
                </Label>
                <Input
                  id="telegram"
                  value={formData.personalInfo.telegram}
                  onChange={(e) => handleInputChange('personalInfo.telegram', e.target.value)}
                  placeholder="Masukkan username Telegram"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center space-x-1">
                  <Globe className="w-4 h-4" />
                  <span>Timezone</span>
                </Label>
                <Select
                  value={formData.personalInfo.timezone}
                  onValueChange={(value) => handleInputChange('personalInfo.timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                    <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                    <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-red-600" />
                Alamat
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Alamat Lengkap</Label>
                  <textarea
                    id="address"
                    value={formData.personalInfo.address}
                    onChange={(e) => handleInputChange('personalInfo.address', e.target.value)}
                    placeholder="Masukkan alamat lengkap"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Kota</Label>
                  <Select
                    value={formData.personalInfo.city}
                    onValueChange={(value) => handleInputChange('personalInfo.city', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih kota" />
                    </SelectTrigger>
                    <SelectContent>
                      {indonesianCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Provinsi</Label>
                  <Input
                    id="province"
                    value={formData.personalInfo.province}
                    onChange={(e) => handleInputChange('personalInfo.province', e.target.value)}
                    placeholder="Masukkan provinsi"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex items-center"
            >
              <X className="w-4 h-4 mr-2" />
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Membuat...' : 'Buat Pengguna'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}