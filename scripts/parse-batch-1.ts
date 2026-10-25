import * as fs from 'fs';

const rawData = `8/23/2025 8:54:06Juz 30 - Sitti Aminah - 35 - BalikpapanMAA Juz 30 - Kamis - 13.00 WIB
8/25/2025 9:15:14Juz 30 - Ayulandari - 29 - PagaralajMAA Juz 30 - Kamis - 13.00 WIB
8/25/2025 0:43:06Juz 30 - Ramla Usman - 53 - Bekasi SelatanMAA Juz 30 - Kamis - 13.00 WIB
8/24/2025 17:56:58Juz 30 - Willy yanda - 38 - sumbarMBA Juz 30 - Kamis - 13.30 WIB
8/25/2025 13:30:59Juz 30 - Nurdiani - 43 - SolokMBA Juz 30 - Kamis - 13.30 WIB
8/25/2025 15:09:06Juz 30 - Catur Prasetyaningtyas - 50 - GresikMBA Juz 30 - Kamis - 13.30 WIB
8/25/2025 20:10:52Juz 30 - Nur Hikmah - 59 - SemarangMBA Juz 30 - Kamis - 13.30 WIB
8/22/2025 22:50:03Juz 29 - Nur Rohmah - 43 - DepokMDF Juz 29 - Sabtu - 16.00 WIB
8/24/2025 16:55:00Juz 29 - Erlin - 61 - BalikpapanMDF Juz 29 - Sabtu - 16.00 WIB
8/24/2025 13:04:23Juz 29 - Enih Suhaenih - 45 - Kab. SerangMDF Juz 29 - Sabtu - 19.30 WIB
8/25/2025 9:58:40Juz 29 - Resa Septilia - 30 - DepokMDF Juz 29 - Sabtu - 19.30 WIB
8/27/2025 0:23:21Juz 29 - Yuli Hartati - 38 - palembangMDF Juz 29 - Sabtu - 19.30 WIB
8/22/2025 21:15:22Juz 29 - Lili Afrianti 46 - 46 - PayakumbuhMDL Juz 29 - Rabu - 19.30 WIB
8/22/2025 23:17:08Juz 29 - Ifa Lathifah - 39 - kab.situbndoMDL Juz 29 - Rabu - 19.30 WIB
8/23/2025 8:59:51Juz 29 - Eri Choriyah - 43 - BogorMDL Juz 29 - Rabu - 19.30 WIB
8/23/2025 9:10:48Juz 29 - Luluk Rohmiati - 39 - KediriMDL Juz 29 - Rabu - 19.30 WIB
8/23/2025 9:37:15Juz 29 - Apriyati - 46 - TangerangMDL Juz 29 - Rabu - 19.30 WIB
8/25/2025 9:21:59Juz 30 - Ruddini - 40 - Padang PanjangMES Juz 30 - Selasa - 16.00 WIB
8/25/2025 15:50:59Juz 30 - Lusi Tiarani - 51 - BandungMES Juz 30 - Selasa - 16.00 WIB
Juz 30 - Tri Rahmawati - 50 - Lampung selatanMES Juz 30 - Selasa - 16.00 WIB
8/23/2025 9:26:27Juz 29 - Marella mughni rahim - 37 - BatamMKM Juz 29 - Jum'at - 08.00 WIB
8/23/2025 11:16:30Juz 29 - Syamsiah. B - 50 - Balikpapan, Kalimantan TimurMKM Juz 29 - Jum'at - 08.00 WIB
8/24/2025 20:21:50Juz 29 - Novi Cahyati - 31 - CilacapMKM Juz 29 - Jum'at - 08.00 WIB
8/24/2025 20:28:20Juz 29 - Mardiana - 49 - MakassarMKM Juz 29 - Jum'at - 08.00 WIB
8/26/2025 10:34:04Juz 29 - Sainah - 48 - Pondok ranggon jakarta timurMKM Juz 29 - Jum'at - 08.00 WIB
8/24/2025 18:57:22Juz 29 - Zuriati usman - 51 - MakassarMM1 Juz 29 - Kamis - 13.00 WIB
8/24/2025 21:49:47Juz 29 - Wiwik widayati - 61 - KlatenMM1 Juz 29 - Kamis - 13.00 WIB
8/25/2025 12:50:31Juz 29 - Afni Anti - 33 - Pasaman BaratMM1 Juz 29 - Kamis - 13.00 WIB
8/22/2025 22:20:36Juz 30 - Mista,S.Si - 43 - Enrekang-SulselMM1 Juz 30 - Sabtu - 20.00 WIB
8/24/2025 2:15:59Juz 30 - Purwaningtyas M E - 41 - CileungsiMM1 Juz 30 - Sabtu - 20.00 WIB
8/24/2025 8:19:43Juz 30 - Octavia Paramitha - 28 - SitubondoMM1 Juz 30 - Sabtu - 20.00 WIB
8/22/2025 23:08:50Juz 29 - Wahyu Suci Fatriyanti - 30 - PamekasanMN1 Juz 29 - Selasa - 19.00 WIB
8/23/2025 10:10:16Juz 29 - Dewi Nurhayati - 28 - CianjurMN1 Juz 29 - Selasa - 19.00 WIB
8/25/2025 13:44:39Juz 29 - Ijah saijah - 46 - JakartaMN1 Juz 29 - Selasa - 19.00 WIB
8/25/2025 15:59:54Juz 29 - BAIQ ROSMALA DEWI - 35 - KOTA MATARAM NTBMN1 Juz 29 - Selasa - 19.00 WIB
8/25/2025 19:39:24Juz 29 - Kartini - 47 - SemarangMN1 Juz 29 - Selasa - 19.00 WIB
8/22/2025 20:03:52Juz 30 - Mutiara Ananda - 24 - jambiMPP Juz 30 - Ahad - 06.00 WIB
8/22/2025 22:38:39Juz 30 - Sri dilia ningsih - 47 - Kota PadangMPP Juz 30 - Ahad - 06.00 WIB
8/23/2025 0:55:00Juz 30 - Wara Hardhiani - 33 - Klaten Jawa TengahMPP Juz 30 - Ahad - 06.00 WIB
8/23/2025 1:23:54Juz 30 - Hafizhah - 17 - PadangMPP Juz 30 - Ahad - 06.00 WIB
8/23/2025 8:34:59Juz 30 - Rina Mayang Sari - 28 - MaduraMPP Juz 30 - Ahad - 06.00 WIB
8/23/2025 23:41:04Juz 30 - Sri Wahyuningsih - 49 - SemarangMRM Juz 30 - Sabtu - 19.15 WIB
8/24/2025 20:16:16Juz 30 - Nurhadiah ningsih - 34 - PamekasanMRM Juz 30 - Sabtu - 19.15 WIB
8/25/2025 2:07:32Juz 30 - Rizqi Arzia - 54 - BekasiMRM Juz 30 - Sabtu - 19.15 WIB
8/25/2025 15:47:54Juz 30 - Siti Mukla - 35 - JambiMRM Juz 30 - Sabtu - 19.15 WIB
8/25/2025 17:20:35Juz 30 - Agustinaeliyanti - 49 - Ogan ilir PalembangMRM Juz 30 - Sabtu - 19.15 WIB
8/25/2025 14:43:57Juz 30 - Rini Afriani - 35 - Lampung SelatanMS1 Juz 30 - Sabtu - 15.30 WIB
8/25/2025 15:44:02Juz 30 - Suci Nuraeni - 30 - BandungMS1 Juz 30 - Sabtu - 15.30 WIB
8/25/2025 23:51:05Juz 30 - Arsi - 27 - Sumatera UtaraMS1 Juz 30 - Sabtu - 15.30 WIB
8/26/2025 15:09:04Juz 30 - Nurul Hayati - 57 - AcehMS1 Juz 30 - Sabtu - 15.30 WIB
8/22/2025 21:48:27Juz 30 - Ria Maila - 41 - BandungMS1 Juz 30 - Senin - 10.00 WIB
8/23/2025 11:10:11Juz 30 - Enny Iqbal - 50 - MedanMS1 Juz 30 - Senin - 10.00 WIB
8/24/2025 16:09:59Juz 30 - Yuliana - 45 - MakasarMS1 Juz 30 - Senin - 10.00 WIB
8/25/2025 15:38:35Juz 30 - Ayu Purwati - 31 - PalembangMS1 Juz 30 - Senin - 10.00 WIB
8/25/2025 16:13:48Juz 30 - Lina Wartabone - 46 - GorontaloMS1 Juz 30 - Senin - 10.00 WIB
8/23/2025 17:16:07Juz 28 - Zelly - 50 - SitubondoMT1 Juz 28 - Rabu - 06.00 WIB
8/24/2025 12:53:46Juz 28 - Widaningsih - 48 - GarutMT1 Juz 28 - Rabu - 06.00 WIB
8/25/2025 9:40:05Juz 28 - Muslimah - 42 - BalikpapanMT1 Juz 28 - Rabu - 06.00 WIB
8/25/2025 12:55:15Juz 28 - Rugaiyah - 45 - Situbondo Jawa TimurMT1 Juz 28 - Rabu - 06.00 WIB
8/23/2025 5:13:02Juz 28 - Nur'afifah Amatullah - 30 - BogorMUS Juz 28 - Kamis - 09.15 WIB
8/24/2025 22:00:34Juz 28 - Annisa maulani - 26 - DepokMUS Juz 28 - Kamis - 09.15 WIB
8/24/2025 22:40:39Juz 28 - Yunita Dian Fakih - 31 - BogorMUS Juz 28 - Kamis - 09.15 WIB
8/25/2025 11:33:46Juz 28 - Zainab binti Yusri - 9 - Padang panjang Sumatera BaratMUS Juz 28 - Kamis - 09.15 WIB
8/22/2025 19:06:13Juz 30 - Yuspalepi - 41 - Cileungsi kabupaten BogorMW1 Juz 30 - Senin - 09.30 WIB
8/22/2025 21:44:51Juz 30 - Nunung Rohayati - 50 - JakartaMW1 Juz 30 - Senin - 09.30 WIB
8/25/2025 15:58:10Juz 30 - Dewi Kupita Sari - 37 - Kudus JatengMW1 Juz 30 - Senin - 09.30 WIB
8/31/2025 22:24:00Juz 30 - sartika - 31 - tanah datarMW1 Juz 30 - Senin - 09.30 WIB
8/22/2025 19:10:49Juz 30 - Fatni Rifqiyati - 36 - BandungMWS Juz 30 - Jum'at - 08.00 WIB
8/23/2025 10:18:22Juz 30 - Syarifah Hamidah - 49 - BalikpapanMWS Juz 30 - Jum'at - 08.00 WIB
8/23/2025 18:28:18Juz 30 - Yusmawati - 49 - LampungMWS Juz 30 - Jum'at - 08.00 WIB
8/25/2025 14:10:55Juz 30 - Neny pristiwati - 38 - LangkatMWS Juz 30 - Jum'at - 08.00 WIB
8/25/2025 21:50:26Juz 30 - Desy Arista Mustikasari - 41 - Magetan Jawa TimurMWS Juz 30 - Jum'at - 08.00 WIB
8/24/2025 5:37:50Juz 30 - Vivi Nur Vina - 29 - Kalimantan TengahMEH Juz 30 - Sabtu - 20.00 WIB
8/22/2025 21:11:16Juz 30 - Yulianty Usman - 56 - Jakarta TimurMEH Juz 30 - Sabtu - 20.00 WIB
8/25/2025 15:20:41Juz 29 - Verawaty Kurniasari - 40 - BogorMM1 Juz 29 - Kamis - 13.00 WIB
8/27/2025 20:44:20Juz 29 - Meyntie A Saleh - 36 - Kabupaten GorontaloMM1 Juz 29 - Kamis - 13.00 WIB`;

export interface RawEntry {
  lineNum: number;
  rawTs: string;
  timestamp: Date;
  juz: number;
  fullName: string;
  age: number;
  city: string;
  scheduleCode: string;
}

export function parseBatch1Raw(): RawEntry[] {
  const lines = rawData.trim().split('\n').filter(l => l.trim().length > 0);
  
  return lines.map((line, idx) => {
    let tsStr = '';
    let rest = line.trim();

    const tsMatch = rest.match(/^(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2})/);
    if (tsMatch) {
      tsStr = tsMatch[1];
      rest = rest.slice(tsStr.length).trim();
    } else {
      // Baris Tri Rahmawati tidak punya timestamp, kita assign timestamp wajar di tanggal 25 Aug 2025
      tsStr = '8/25/2025 15:55:00';
    }

    // Pola rest: "Juz 30 - Sitti Aminah - 35 - BalikpapanMAA Juz 30 - Kamis - 13.00 WIB"
    // Terkadang ada nama seperti "Lili Afrianti 46 - 46 - Payakumbuh"
    const m = rest.match(/Juz\s+(\d+)\s*-\s*(.+?)\s*-\s*(\d+)\s*-\s*(.+?)([A-Z0-9]{3}\s+Juz.*$)/i);
    if (!m) {
      console.warn(`Line ${idx + 1} did not match standard regex:`, rest);
      return {
        lineNum: idx + 1,
        rawTs: tsStr,
        timestamp: new Date(tsStr),
        juz: 30,
        fullName: rest,
        age: 0,
        city: '',
        scheduleCode: ''
      };
    }

    return {
      lineNum: idx + 1,
      rawTs: tsStr,
      timestamp: new Date(tsStr),
      juz: parseInt(m[1], 10),
      fullName: m[2].trim(),
      age: parseInt(m[3], 10),
      city: m[4].trim(),
      scheduleCode: m[5].trim()
    };
  });
}

if (require.main === module) {
  const parsed = parseBatch1Raw();
  console.log('Total entries:', parsed.length);
  // Sort chronologically by timestamp
  const sorted = [...parsed].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  console.log('\nTop 5 chronological entries:');
  sorted.slice(0, 5).forEach((e, i) => {
    console.log(`${i + 1}. [${e.rawTs}] ${e.fullName} (Juz ${e.juz}, ${e.city})`);
  });
  console.log('\nLast 5 chronological entries:');
  sorted.slice(-5).forEach((e, i) => {
    console.log(`${sorted.length - 5 + i + 1}. [${e.rawTs}] ${e.fullName} (Juz ${e.juz}, ${e.city})`);
  });
}
