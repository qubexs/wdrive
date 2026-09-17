// @ts-nocheck
const { PrismaClient } = require("@prisma/client");

const DEPARTMENTS = [
  "Jabatan Anestesiologi",
  "Jabatan Bedah Mulut dan Maksilofasial",
  "Jabatan Pergigian Pediatrik",
  "Jabatan Pergigian Penjagaan Khas",
  "Jabatan Psikiatri dan Kesihatan Mental",
  "Jabatan Patologi",
  "Jabatan Kerja Sosial Perubatan",
  "Jabatan Dietetik & Sajian",
  "Unit Fisioterapi",
  "Jabatan Perubatan Rehabilitasi",
  "Unit Terapi Cara Kerja",
  "Unit Terapi Pertuturan Bahasa",
  "Unit Nefrologi",
  "Jabatan Perubatan Forensik",
  "Unit Penjagaan Luka",
  "Unit Pengurusan Risiko Pekerjaan",
  "Unit Pengurusan Risiko & Survelan Klinikal",
  "Unit Medikolegal",
  "Unit Pencegahan & Kawalan Infeksi",
  "Unit Penyelidikan Klinikal",
  "Pejabat Pengarah Hospital",
  "Unit Perhubungan Awam",
  "Bahagian Perubatan",
  "Bahagian Pengurusan",
  "Unit Dasar Perubatan & Perancangan Perkhidmatan Klinikal",
  "Unit Perkembangan Profession Pakar & Pegawai Perubatan",
  "Jabatan Perubatan Am",
  "Jabatan Kecemasan & Trauma",
  "Jabatan Radiologi",
  "Jabatan Ortopedik",
  "Jabatan Pediatrik",
  "Jabatan Pembedahan",
  "Jabatan O&G",
  "Jabatan Rekod Perubatan",
  "Jabatan Farmasi",
  "Unit Kejururawatan",
  "Unit Kejuruteraan",
  "Unit Sumber Manusia",
  "Unit Penyelia Hospital",
  "Unit Kewangan & Hasil",
  "Unit Pentadbiran, Aset & Stor",
  "Unit Teknologi Maklumat",
  "Unit Perolehan & Pembangunan",
  "Unit Hal Ehwal Islam",
  "Unit Keselamatan",
  "Unit Psikologi Kaunseling",
];

async function main() {
  const db = new PrismaClient();
  try {
    // 1. Upsert canonical departments
    for (const name of DEPARTMENTS) {
      await db.department.upsert({
        where: { name },
        update: { isActive: true },
        create: { name, isActive: true },
      });
    }
    console.log(`Upserted ${DEPARTMENTS.length} departments`);

    // 2. Backfill: users with legacy string but no FK
    const users = await db.user.findMany({
      where: { departmentId: null, NOT: { department: null } },
      select: { id: true, department: true },
    });
    console.log(`Found ${users.length} users with legacy department strings`);
    const deptCache = new Map();
    const allDepts = await db.department.findMany({ select: { id: true, name: true } });
    for (const d of allDepts) deptCache.set(d.name.toLowerCase(), d);

    let linked = 0;
    let created = 0;
    for (const u of users) {
      const raw = (u.department || "").trim().replace(/\s+/g, " ");
      if (!raw) continue;
      let dept = deptCache.get(raw.toLowerCase());
      if (!dept) {
        // unknown legacy value -> create as inactive for admin review
        dept = await db.department.create({ data: { name: raw.slice(0, 100), isActive: false } });
        deptCache.set(raw.toLowerCase(), dept);
        created++;
      }
      await db.user.update({ where: { id: u.id }, data: { departmentId: dept.id, department: dept.name } });
      linked++;
    }
    console.log(`Linked ${linked} users, created ${created} inactive departments for unknown values`);

    // 3. Sync: users with FK but stale string (e.g. renamed departments)
    const withFk = await db.user.findMany({
      where: { NOT: { departmentId: null } },
      select: { id: true, departmentId: true, department: true },
    });
    let synced = 0;
    for (const u of withFk) {
      const dept = await db.department.findUnique({ where: { id: u.departmentId } });
      if (dept && dept.name !== u.department) {
        await db.user.update({ where: { id: u.id }, data: { department: dept.name } });
        synced++;
      }
    }
    console.log(`Synced ${synced} stale strings`);
    await db.$disconnect();
  } catch (e) {
    try {
      const { PrismaClient: PC2 } = require("@prisma/client");
    } catch {}
    throw e;
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
