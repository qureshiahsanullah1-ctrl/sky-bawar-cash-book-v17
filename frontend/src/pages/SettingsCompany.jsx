import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Upload, Trash2, MapPin, Phone, Mail, Globe, FileText, Award, Loader2 } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';
import { api } from '../services/api';

export default function SettingsCompany(props) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);

  async function onLogoFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      props.onStatus?.(t('Logo must be PNG, JPG, or SVG.'));
      event.target.value = '';
      return;
    }

    setUploading(true);
    const processUpload = async (uploadFile, fallbackDataUrl) => {
      props.onStatus?.(t('Uploading logo...'));
      try {
        const res = await api.uploadMedia(uploadFile);
        if (res && res.url) {
          props.setCompanyLogo(res.url);
          props.onStatus?.(t('Logo updated successfully.'));
        } else {
          throw new Error('Upload returned empty response.');
        }
      } catch (err) {
        console.warn('Media upload failed, using local storage fallback:', err);
        props.setCompanyLogo(fallbackDataUrl);
        props.onStatus?.(t('Logo updated (local database storage).'));
      } finally {
        setUploading(false);
      }
    };

    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = async () => {
        await processUpload(file, reader.result);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 512;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const resizedDataUrl = canvas.toDataURL('image/png', 0.9);
      URL.revokeObjectURL(objectUrl);

      canvas.toBlob(async (blob) => {
        const processedFile = new File([blob || file], file.name.replace(/\.[^/.]+$/, '.png'), { type: 'image/png' });
        await processUpload(processedFile, resizedDataUrl);
      }, 'image/png', 0.9);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      props.onStatus?.(t('Failed to process image file.'));
      setUploading(false);
    };
    img.src = objectUrl;
    event.target.value = '';
  }

  return (
    <section className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm backdrop-blur-md transition-all">
      <header className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('Company Profile & Branding')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('Manage legal identity, document header branding, and official organization details.')}</p>
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 hidden sm:inline-block">
          {t('Official Business Profile')}
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="flex flex-col items-center justify-between p-5 bg-gradient-to-b from-slate-50 to-slate-100/70 dark:from-slate-950/60 dark:to-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 text-center gap-4">
          <div className="w-full flex flex-col items-center gap-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">{t('Official Header Logo')}</span>
            <div className="relative group p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center min-w-[140px] min-h-[140px]">
              <CompanyLogo logo={props.companyLogo} name={props.companyName} size="lg" />
              {uploading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-2xl flex items-center justify-center backdrop-blur-xs">
                  <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={24} />
                </div>
              )}
            </div>
            
            <div className="mt-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">{props.companyName || 'BAWAR STAR PLASTIC INDUSTRY'}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('Enterprise Management Platform')}</p>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <label className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2">
              <Upload size={15} />
              <span>{uploading ? t('Uploading Logo...') : t('Upload Brand Logo')}</span>
              <input type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={onLogoFile} disabled={uploading} />
            </label>

            {props.companyLogo && (
              <button 
                type="button" 
                onClick={() => props.setCompanyLogo('')} 
                className="w-full py-2 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>{t('Remove Logo')}</span>
              </button>
            )}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{t('Supports PNG, JPG, or SVG images')}</span>
          </div>
        </div>

        {/* Right Column: Contact Details Form */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 size={14} className="text-blue-500" />
              <span>{t('Company Name')}</span>
            </label>
            <input 
              type="text" 
              className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
              value={props.companyName || ''} 
              onChange={(e) => props.setCompanyName(e.target.value)} 
              placeholder={t('Full legal business name...')}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin size={14} className="text-blue-500" />
              <span>{t('Company Address')}</span>
            </label>
            <input 
              type="text" 
              className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
              value={props.companyAddress || ''} 
              onChange={(e) => props.setCompanyAddress(e.target.value)} 
              placeholder={t('Physical factory or office location...')} 
              dir="auto" 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone size={14} className="text-blue-500" />
              <span>{t('Contact Phone')}</span>
            </label>
            <input 
              type="text" 
              className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
              value={props.companyPhone || ''} 
              onChange={(e) => props.setCompanyPhone(e.target.value)} 
              placeholder="+93 7XX XXX XXX"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mail size={14} className="text-blue-500" />
              <span>{t('Email Address')}</span>
            </label>
            <input 
              type="email" 
              className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
              value={props.companyEmail || ''} 
              onChange={(e) => props.setCompanyEmail(e.target.value)} 
              placeholder="info@company.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe size={14} className="text-blue-500" />
              <span>{t('Official Website')}</span>
            </label>
            <input 
              type="text" 
              className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
              value={props.companyWebsite || ''} 
              onChange={(e) => props.setCompanyWebsite(e.target.value)} 
              placeholder="www.company.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText size={14} className="text-blue-500" />
              <span>{t('Tax Identification Number (TIN)')}</span>
            </label>
            <input 
              type="text" 
              className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
              value={props.companyTaxNumber || ''} 
              onChange={(e) => props.setCompanyTaxNumber(e.target.value)} 
              placeholder={t('Tax Registration ID...')}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Award size={14} className="text-blue-500" />
              <span>{t('Business License & Registration Details')}</span>
            </label>
            <input 
              type="text" 
              className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
              value={props.companyLicense || ''} 
              onChange={(e) => props.setCompanyLicense(e.target.value)} 
              placeholder={t('Commercial Ministry License No...')}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

