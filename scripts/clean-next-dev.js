Promise.all([import('node:fs'), import('node:path')])
  .then(([fs, path]) => {
    const devCachePath = path.join(process.cwd(), '.next', 'dev');

    try {
      fs.rmSync(devCachePath, { recursive: true, force: true });
    } catch (error) {
      console.error(`Gagal menghapus ${devCachePath}`);
      console.error(error);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Gagal memuat modul pembersih cache development');
    console.error(error);
    process.exit(1);
  });
