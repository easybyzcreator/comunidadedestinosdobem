import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowLeft, 
  Printer, 
  Sparkles, 
  Share2 
} from 'lucide-react';

interface AdminQRViewProps {
  onBackToForm: () => void;
}

export const AdminQRView: React.FC<AdminQRViewProps> = ({ onBackToForm }) => {
  const [formUrl, setFormUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Get the base application URL (without hash)
    if (typeof window !== 'undefined') {
      const cleanPath = window.location.pathname;
      const origin = window.location.origin;
      const targetUrl = `${origin}${cleanPath}`;
      setFormUrl(targetUrl);
    }
  }, []);

  useEffect(() => {
    if (!formUrl) return;

    // Generate high resolution QR code on canvas
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        formUrl,
        {
          width: 320,
          margin: 2,
          color: {
            dark: '#06351e', // Dark emerald brand color
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        },
        (error) => {
          if (error) console.error('Erro ao gerar QR Code no canvas:', error);
        }
      );
    }

    // Also generate data URL for instant downloading
    QRCode.toDataURL(
      formUrl,
      {
        width: 1000,
        margin: 2,
        color: {
          dark: '#06351e',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (error, url) => {
        if (!error && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [formUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar link:', err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = 'qrcode-destinos-do-bem.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-emerald-800/95 backdrop-blur-md border-b border-emerald-700/50 text-white py-3 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBackToForm}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full transition-all border border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Formulário</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-200 bg-emerald-900/60 px-2.5 py-1 rounded-full border border-emerald-700">
              Painel Administrativo
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-4 pt-8 space-y-6">
        {/* Title Header Card */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
            <QrCode className="w-3.5 h-3.5" />
            <span>QR CODE OFICIAL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Acesso Rápido ao Formulário
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
            Mostre este QR Code no seu celular ou imprima para que as pessoas acessem e preencham o formulário de cadastro na hora!
          </p>
        </div>

        {/* QR Code Presentation Box */}
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-emerald-100 text-center space-y-6">
          <div className="inline-block p-4 sm:p-6 bg-white rounded-3xl border-2 border-emerald-500/30 shadow-lg relative group">
            <canvas ref={canvasRef} className="mx-auto rounded-xl w-[260px] h-[260px] sm:w-[280px] sm:h-[280px]" />
            <div className="mt-3 flex items-center justify-center gap-1.5 text-emerald-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Aponte a câmera do celular</span>
            </div>
          </div>

          {/* Link box */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 text-left">
              Link de direcionamento:
            </label>
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={formUrl}
                className="flex-1 bg-transparent text-xs sm:text-sm text-slate-700 font-mono outline-none truncate px-2"
              />
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDownloadQR}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-sm font-bold rounded-2xl transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Imagem (PNG)</span>
            </button>

            <button
              onClick={handlePrint}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] text-slate-800 text-sm font-bold rounded-2xl transition-all border border-slate-200"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir QR Code</span>
            </button>
          </div>

          <div className="pt-2">
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              <span>Testar abrindo o formulário em nova aba</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Tip Card */}
        <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-100/90 text-xs sm:text-sm text-emerald-950 space-y-1.5">
          <p className="font-bold flex items-center gap-1.5">
            💡 Dica para eventos e abordagens:
          </p>
          <p className="text-emerald-900/90 leading-relaxed">
            Você pode deixar esta página aberta no seu celular ou tablet em eventos para as pessoas aproximarem a câmera e fazerem a inscrição na hora, ou imprimir o QR Code para colocar em totens e folders.
          </p>
        </div>
      </main>
    </div>
  );
};
