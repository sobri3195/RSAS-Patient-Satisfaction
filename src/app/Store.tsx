import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { emptyDataset } from '../data/defaults';
import { makeDemo } from '../data/demo';
import type { Dataset } from '../domain/schema';
import { downloadFile, loadDataset, saveDataset, storageKey } from '../repositories/storage';
type Store = {
  data: Dataset;
  demo: boolean;
  update: (fn: (d: Dataset) => Dataset) => void;
  setDemo: (value: boolean) => void;
  message: string;
  notify: (m: string) => void;
};
const Context = createContext<Store | null>(null);
function initialState() {
  let demo = false;
  try {
    demo = sessionStorage.getItem('rsas.skm.v1.mode') === 'demo';
    return { demo, data: loadDataset(demo), failure: '' };
  } catch (e) {
    return { demo, data: emptyDataset(), failure: (e as Error).message };
  }
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(initialState);
  const [demo, setMode] = useState(initial.demo);
  const [message, notify] = useState('');
  const [failure, setFailure] = useState(initial.failure);
  const [data, setData] = useState(initial.data);
  function update(fn: (d: Dataset) => Dataset) {
    try {
      const current = localStorage.getItem(storageKey(demo)) ? loadDataset(demo) : data;
      const next = fn(structuredClone(current));
      saveDataset(next, demo);
      setData(next);
    } catch (e) {
      notify((e as Error).message);
      throw e;
    }
  }
  function setDemo(value: boolean) {
    try {
      let next = loadDataset(value);
      if (value && !localStorage.getItem(storageKey(true))) {
        next = makeDemo();
        saveDataset(next, true);
      }
      sessionStorage.setItem('rsas.skm.v1.mode', value ? 'demo' : 'production');
      setData(next);
      setMode(value);
      notify(
        value ? 'DATA SIMULASI aktif. Data operasional tetap terpisah.' : 'Mode operasional aktif.',
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey(demo)) {
        try {
          setData(loadDataset(demo));
          notify('Data diperbarui dari tab lain.');
        } catch (e) {
          setFailure((e as Error).message);
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [demo]);
  if (failure)
    return (
      <main className="recovery card">
        <h1>Pemulihan penyimpanan</h1>
        <p role="alert">{failure}</p>
        <button
          onClick={() =>
            downloadFile(
              'rsas-pemulihan.txt',
              localStorage.getItem(storageKey(demo)) ?? '',
              'text/plain',
            )
          }
        >
          Unduh salinan mentah
        </button>
        <button
          className="danger"
          onClick={() => {
            if (
              confirm('Salinan sudah diunduh? Hapus data lokal yang tidak terbaca?') &&
              prompt('Ketik HAPUS untuk konfirmasi kedua') === 'HAPUS'
            ) {
              localStorage.removeItem(storageKey(demo));
              location.reload();
            }
          }}
        >
          Hapus dan mulai ulang
        </button>
      </main>
    );
  return (
    <Context.Provider value={{ data, demo, update, setDemo, message, notify }}>
      {children}
      {message && (
        <div role="status" className="toast">
          <span>{message}</span>
          <button aria-label="Tutup pemberitahuan" onClick={() => notify('')}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useStore() {
  const v = useContext(Context);
  if (!v) throw Error('Provider tidak tersedia');
  return v;
}
