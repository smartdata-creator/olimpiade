// Fungsi & data bersama untuk seluruh halaman KAGUM Olimpiade 2026.

// Daftar hotel bawaan — dipakai sebagai fallback selama sheet "Hotel" belum diisi dari admin.
const HOTEL_LIST = [
    "Golden Flower Hotel Bandung",
    "Gino Feruci Braga Hotel",
    "Gino Feruci Kebonjati Hotel",
    "Grand Serela Setiabudhi Hotel",
    "Banana Inn Hotel Bandung",
    "Serela Riau Hotel",
    "Serela Cihampelas Hotel",
    "Serela Merdeka Hotel",
    "Zodiak Asia Afrika Hotel",
    "Zodiak Kebon Kawung Hotel",
    "Zodiak MT Haryono Jakarta",
    "KAGUM Holding Office"
];

// Ambil daftar hotel (id + name) dari sheet "Hotel". Jatuh ke HOTEL_LIST bawaan kalau sheet kosong/gagal dimuat.
async function fetchHotelRecords() {
    const fallback = HOTEL_LIST.map((name, i) => ({ id: `default-${i}`, name }));
    if (!CONFIG.GOOGLE_SCRIPT_URL) {
        console.warn("CONFIG.GOOGLE_SCRIPT_URL belum diisi — daftar hotel pakai data bawaan.");
        return fallback;
    }
    try {
        const res = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?sheet=hotel`, { method: "GET" });
        const data = await res.json();
        if (!data.length) return fallback;
        return data
            .map(row => ({ id: row.id, name: row.name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
        console.error("Gagal memuat daftar hotel:", err);
        return fallback;
    }
}

// Sama seperti fetchHotelRecords(), tapi cuma nama-nama-nya saja — dipakai untuk isi dropdown.
async function fetchHotelNames() {
    const records = await fetchHotelRecords();
    return records.map(r => r.name);
}

// Kirim perubahan data hotel (tambah/ubah/hapus) — hanya untuk halaman admin.
async function postHotelChange(payload) {
    const token = localStorage.getItem("kagum_admin_token") || "";
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...payload, token })
    });
    const result = await res.json();
    if (!result || result.result !== "success") {
        const message = (result && result.message) || "Gagal menyimpan data hotel.";
        if (/token/i.test(message)) {
            localStorage.removeItem("kagum_admin_token");
        }
        throw new Error(message);
    }
    return result;
}

const sportMeta = {
    "Padel": { icon: "fa-table-tennis-paddle-ball", text: "text-olympic-blue", bg: "bg-blue-50", border: "border-blue-200", ring: "from-blue-500 to-cyan-400" },
    "Futsal": { icon: "fa-soccer-ball", text: "text-olympic-red", bg: "bg-red-50", border: "border-red-200", ring: "from-red-500 to-rose-400" },
    "Mancing Mania": { icon: "fa-fish-fins", text: "text-olympic-green", bg: "bg-emerald-50", border: "border-emerald-200", ring: "from-emerald-500 to-teal-400" },
    "Basketball 3 on 3": { icon: "fa-basketball", text: "text-olympic-purple", bg: "bg-purple-50", border: "border-purple-200", ring: "from-purple-600 to-indigo-500" }
};

// Cari ikon & warna untuk sebuah cabang olahraga: utamakan data dari Agenda Lomba
// (karena admin bisa tambah cabang baru bebas di luar 4 cabang resmi), lalu sportMeta,
// lalu default netral kalau sama sekali belum terdaftar di mana pun.
function getSportVisual(sport, agendaList) {
    const fromAgenda = (agendaList || []).find(a => a.sport === sport);
    if (fromAgenda) {
        const theme = getColorTheme(fromAgenda.color);
        return { icon: fromAgenda.icon || "fa-trophy", text: theme.text, bg: theme.bg, border: theme.border, ring: theme.ring };
    }
    if (sportMeta[sport]) return sportMeta[sport];
    return { icon: "fa-trophy", text: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", ring: "from-slate-500 to-slate-400" };
}

// Palet warna tema untuk kartu Agenda Lomba (dipilih bebas oleh admin per cabang)
const COLOR_THEMES = {
    blue: { label: "Biru", text: "text-olympic-blue", bg: "bg-blue-50", border: "border-blue-200", ring: "from-blue-500 to-cyan-400", solid: "bg-olympic-blue", swatch: "#0066FF" },
    red: { label: "Merah", text: "text-olympic-red", bg: "bg-red-50", border: "border-red-200", ring: "from-red-500 to-rose-400", solid: "bg-olympic-red", swatch: "#FF2A55" },
    green: { label: "Hijau", text: "text-olympic-green", bg: "bg-emerald-50", border: "border-emerald-200", ring: "from-emerald-500 to-teal-400", solid: "bg-olympic-green", swatch: "#00C853" },
    purple: { label: "Ungu", text: "text-olympic-purple", bg: "bg-purple-50", border: "border-purple-200", ring: "from-purple-600 to-indigo-500", solid: "bg-olympic-purple", swatch: "#8B5CF6" },
    orange: { label: "Oranye", text: "text-olympic-orange", bg: "bg-orange-50", border: "border-orange-200", ring: "from-orange-500 to-amber-400", solid: "bg-olympic-orange", swatch: "#FF6B00" },
    yellow: { label: "Kuning", text: "text-olympic-yellow", bg: "bg-amber-50", border: "border-amber-200", ring: "from-amber-400 to-yellow-300", solid: "bg-olympic-yellow", swatch: "#FFB800" }
};

function getColorTheme(key) {
    return COLOR_THEMES[key] || COLOR_THEMES.blue;
}

// Jenis pertandingan — menentukan dampaknya ke Papan Skor Medali
const MATCH_TYPES = {
    "": "Pertandingan Biasa",
    "final": "Final (Menang = Emas, Kalah = Perak)",
    "juara3": "Perebutan Juara 3 (Menang = Perunggu)"
};

// Nilai default Informasi Pelaksanaan — dipakai selama sheet "Pengaturan" belum diisi / gagal dimuat
const DEFAULT_SETTINGS = {
    event_date: "18 - 21 September 2026",
    countdown_target: "2026-09-18T09:00",
    venue: "Gino Feruci Sport Center & Venue Partner",
    location_badge: "Bandung, Jawa Barat",
    target_participants: "500+ Karyawan Jaringan KAGUM Hotels",
    quota_percentage: "82"
};

// Ubah timestamp ISO menjadi teks relatif berbahasa Indonesia
function timeAgo(isoString) {
    const then = new Date(isoString).getTime();
    if (isNaN(then)) return isoString || "-";
    const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
    if (diffSec < 60) return "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay} hari lalu`;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
}

// Ikon cabang olahraga / agenda bisa diisi nama ikon FontAwesome (mis. "fa-basketball")
// ATAU link gambar langsung (mis. "https://.../icon.png") — dua-duanya didukung.
function isImageIconUrl(icon) {
    return /^https?:\/\//i.test(String(icon || "").trim());
}

function renderIconHtml(icon, fontSizeClass, imgClass) {
    const value = String(icon || "").trim();
    if (isImageIconUrl(value)) {
        return `<img src="${escapeHtml(value)}" alt="" class="${imgClass || "w-2/3 h-2/3 object-contain"}">`;
    }
    return `<i class="fa-solid ${value || "fa-trophy"} ${fontSizeClass || ""}"></i>`;
}

// Ambil seluruh data peserta dari Google Sheets, terbaru lebih dulu
async function fetchParticipants() {
    if (!CONFIG.GOOGLE_SCRIPT_URL) {
        console.warn("CONFIG.GOOGLE_SCRIPT_URL belum diisi — daftar peserta tidak bisa dimuat.");
        return [];
    }
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, { method: "GET" });
    const data = await res.json();
    return data
        .map(row => ({
            name: row.name,
            phone: row.phone,
            hotel: row.hotel,
            position: row.position,
            sport: row.sport,
            timestamp: row.timestamp
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Ambil seluruh data agenda lomba (cabang, tempat, jadwal) dari sheet "Agenda"
async function fetchAgenda() {
    if (!CONFIG.GOOGLE_SCRIPT_URL) {
        console.warn("CONFIG.GOOGLE_SCRIPT_URL belum diisi — agenda tidak bisa dimuat.");
        return [];
    }
    const res = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?sheet=agenda`, { method: "GET" });
    const data = await res.json();
    return data.map(row => ({
        id: row.id,
        sport: row.sport,
        icon: row.icon || "fa-trophy",
        category: row.category,
        venue: row.venue,
        schedule: row.schedule,
        color: row.color || "blue",
        description: row.description
    }));
}

// Ambil seluruh data pertandingan (tim A vs tim B, skor) dari sheet "Pertandingan"
async function fetchMatches() {
    if (!CONFIG.GOOGLE_SCRIPT_URL) {
        console.warn("CONFIG.GOOGLE_SCRIPT_URL belum diisi — pertandingan tidak bisa dimuat.");
        return [];
    }
    const res = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?sheet=pertandingan`, { method: "GET" });
    const data = await res.json();
    return data.map(row => ({
        id: row.id,
        sport: row.sport,
        stage: row.stage,
        match_type: row.match_type || "",
        team_a: row.team_a,
        team_b: row.team_b,
        venue: row.venue,
        schedule: row.schedule,
        score_a: row.score_a === "" || row.score_a === undefined ? null : Number(row.score_a),
        score_b: row.score_b === "" || row.score_b === undefined ? null : Number(row.score_b)
    }));
}

// Hitung Papan Skor Medali dari daftar pertandingan (murni fungsi, tanpa fetch)
function computeMedalStandings(matches) {
    const tally = {};
    function ensure(hotel) {
        if (!tally[hotel]) tally[hotel] = { hotel, gold: 0, silver: 0, bronze: 0 };
        return tally[hotel];
    }

    matches.forEach(m => {
        if (m.score_a === null || m.score_b === null || isNaN(m.score_a) || isNaN(m.score_b)) return;
        if (m.score_a === m.score_b) return; // seri, tidak menghasilkan medali
        if (m.match_type !== "final" && m.match_type !== "juara3") return;

        const winner = m.score_a > m.score_b ? m.team_a : m.team_b;
        const loser = m.score_a > m.score_b ? m.team_b : m.team_a;
        if (!winner) return;

        if (m.match_type === "final") {
            ensure(winner).gold += 1;
            if (loser) ensure(loser).silver += 1;
        } else if (m.match_type === "juara3") {
            ensure(winner).bronze += 1;
        }
    });

    return Object.values(tally)
        .map(row => ({ ...row, points: row.gold * 3 + row.silver * 2 + row.bronze * 1 }))
        .sort((a, b) => b.points - a.points || b.gold - a.gold || b.silver - a.silver);
}

// Ambil Informasi Pelaksanaan (tanggal, venue, target peserta, dll) dari sheet "Pengaturan"
async function fetchSettings() {
    if (!CONFIG.GOOGLE_SCRIPT_URL) {
        console.warn("CONFIG.GOOGLE_SCRIPT_URL belum diisi — pengaturan tidak bisa dimuat.");
        return { ...DEFAULT_SETTINGS };
    }
    try {
        const res = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?sheet=pengaturan`, { method: "GET" });
        const data = await res.json();
        return { ...DEFAULT_SETTINGS, ...data };
    } catch (err) {
        console.error("Gagal memuat pengaturan:", err);
        return { ...DEFAULT_SETTINGS };
    }
}

// Cek token admin ke server — dipakai untuk gerbang masuk halaman admin.
async function verifyAdminToken(token) {
    if (!token || !CONFIG.GOOGLE_SCRIPT_URL) return false;
    try {
        const res = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=verify_token&token=${encodeURIComponent(token)}`, { method: "GET" });
        const result = await res.json();
        return !!(result && result.valid);
    } catch (err) {
        console.error("Gagal memverifikasi token admin:", err);
        return false;
    }
}

// Kirim perubahan data agenda (tambah/ubah/hapus) — hanya untuk halaman admin.
async function postAgendaChange(payload) {
    const token = localStorage.getItem("kagum_admin_token") || "";
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...payload, token })
    });
    const result = await res.json();
    if (!result || result.result !== "success") {
        const message = (result && result.message) || "Gagal menyimpan data.";
        if (/token/i.test(message)) {
            localStorage.removeItem("kagum_admin_token");
        }
        throw new Error(message);
    }
    return result;
}

// Kirim perubahan Informasi Pelaksanaan — hanya untuk halaman admin.
async function postSettingsChange(settingsObj) {
    const token = localStorage.getItem("kagum_admin_token") || "";
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "settings_update", settings: settingsObj, token })
    });
    const result = await res.json();
    if (!result || result.result !== "success") {
        const message = (result && result.message) || "Gagal menyimpan pengaturan.";
        if (/token/i.test(message)) {
            localStorage.removeItem("kagum_admin_token");
        }
        throw new Error(message);
    }
    return result;
}

// Hapus satu pendaftaran atlet (salah input) — hanya untuk halaman admin.
async function deleteParticipant(item) {
    const token = localStorage.getItem("kagum_admin_token") || "";
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
            action: "pendaftaran_delete",
            timestamp: item.timestamp,
            name: item.name,
            phone: item.phone,
            token
        })
    });
    const result = await res.json();
    if (!result || result.result !== "success") {
        const message = (result && result.message) || "Gagal menghapus data pendaftaran.";
        if (/token/i.test(message)) {
            localStorage.removeItem("kagum_admin_token");
        }
        throw new Error(message);
    }
    return result;
}

// Kirim perubahan data pertandingan (tambah/ubah/hapus) — hanya untuk halaman admin.
async function postMatchChange(payload) {
    const token = localStorage.getItem("kagum_admin_token") || "";
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...payload, token })
    });
    const result = await res.json();
    if (!result || result.result !== "success") {
        const message = (result && result.message) || "Gagal menyimpan data pertandingan.";
        if (/token/i.test(message)) {
            localStorage.removeItem("kagum_admin_token");
        }
        throw new Error(message);
    }
    return result;
}

// ====== Video Sejarah / History ======

// Ubah link Google Drive atau YouTube biasa menjadi link "embed" yang bisa diputar di <iframe>.
// Return null kalau formatnya tidak dikenali (pemanggil bisa tampilkan tombol "Buka Video" biasa).
function getVideoEmbedUrl(url) {
    if (!url) return null;
    const trimmed = String(url).trim();

    // Sudah berupa link embed/preview
    if (/\/embed\//.test(trimmed) || /\/preview(\?|$)/.test(trimmed)) return trimmed;

    // Google Drive: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    let m = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;

    // Google Drive: https://drive.google.com/open?id=FILE_ID
    m = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;

    // YouTube: https://youtu.be/VIDEO_ID
    m = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;

    // YouTube: https://www.youtube.com/watch?v=VIDEO_ID
    m = trimmed.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;

    return null;
}

// Ambil seluruh video sejarah/momen berkesan dari sheet "Video", terbaru (tahun) lebih dulu
async function fetchVideos() {
    if (!CONFIG.GOOGLE_SCRIPT_URL) {
        console.warn("CONFIG.GOOGLE_SCRIPT_URL belum diisi — video tidak bisa dimuat.");
        return [];
    }
    const res = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?sheet=video`, { method: "GET" });
    const data = await res.json();
    return data
        .map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            year: row.year,
            video_url: row.video_url
        }))
        .sort((a, b) => String(b.year || "").localeCompare(String(a.year || "")));
}

// Kirim perubahan data video (tambah/ubah/hapus) — hanya untuk halaman admin.
async function postVideoChange(payload) {
    const token = localStorage.getItem("kagum_admin_token") || "";
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...payload, token })
    });
    const result = await res.json();
    if (!result || result.result !== "success") {
        const message = (result && result.message) || "Gagal menyimpan data video.";
        if (/token/i.test(message)) {
            localStorage.removeItem("kagum_admin_token");
        }
        throw new Error(message);
    }
    return result;
}

// ====== Logo Hotel & Sponsor ======

// Ubah link gambar Google Drive biasa menjadi link gambar langsung yang bisa dipakai di <img src>.
// URL non-Drive (imgur, dsb) dianggap sudah siap pakai dan dikembalikan apa adanya.
function getImageDirectUrl(url) {
    if (!url) return null;
    const trimmed = String(url).trim();

    let m = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w600`;

    m = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w600`;

    return trimmed;
}

// Ambil seluruh logo hotel & sponsor dari sheet "Logo"
async function fetchLogos() {
    if (!CONFIG.GOOGLE_SCRIPT_URL) {
        console.warn("CONFIG.GOOGLE_SCRIPT_URL belum diisi — logo tidak bisa dimuat.");
        return [];
    }
    const res = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?sheet=logo`, { method: "GET" });
    const data = await res.json();
    return data.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type || "hotel",
        image_url: row.image_url,
        link: row.link
    }));
}

// Kirim perubahan data logo (tambah/ubah/hapus) — hanya untuk halaman admin.
async function postLogoChange(payload) {
    const token = localStorage.getItem("kagum_admin_token") || "";
    const res = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...payload, token })
    });
    const result = await res.json();
    if (!result || result.result !== "success") {
        const message = (result && result.message) || "Gagal menyimpan data logo.";
        if (/token/i.test(message)) {
            localStorage.removeItem("kagum_admin_token");
        }
        throw new Error(message);
    }
    return result;
}
