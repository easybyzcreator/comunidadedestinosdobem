/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Sparkles, 
  Heart, 
  User, 
  Phone, 
  MapPin, 
  ArrowRight, 
  AlertCircle,
  Accessibility,
  ExternalLink,
  Users
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AdminQRView } from './components/AdminQRView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FAIXAS_ETARIAS_CRIANCAS = [
  'Até 5 anos',
  '6 a 11 anos',
  '12 a 14 anos',
  '15 a 17 anos',
] as const;

export type FormData = {
  nome: string; // 1. Nome completo do responsável *
  whatsapp: string; // 2. WhatsApp para contato *
  cidade: string; // 3. Em qual cidade você mora? *
  
  // 👱‍♀️ SOBRE AS CRIANÇAS
  acompanhadoCriancas: 'Sim' | 'Não' | ''; // 4. Você está acompanhado(a) de criança(s)?
  qtdCriancas: string; // 5. Quantas crianças estão com você? '1' | '2' | '3' | '4' | 'outra quantidade' | ''
  qtdCriancasOutra: string; // texto em outra quantidade
  faixasEtariasCriancas: string[]; // 6. Qual a faixa etária da(s) criança(s)?
  
  // ♿ ACESSIBILIDADE
  pcd: 'Não' | 'Sim' | ''; // 7. Algum participante é pessoa com deficiência (PCD)?
  pcdQual: string; // qual deficiência ou necessidade específica?
  necessitaAcessibilidade: 'Não' | 'Sim' | ''; // 8. Algum participante necessita de cadeira de rodas ou outro recurso de acessibilidade? *
  acessibilidadeQual: string; // qual?
};

export default function App() {
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    whatsapp: '',
    cidade: '',
    acompanhadoCriancas: '',
    qtdCriancas: '',
    qtdCriancasOutra: '',
    faixasEtariasCriancas: [],
    pcd: '',
    pcdQual: '',
    necessitaAcessibilidade: '',
    acessibilidadeQual: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Controle de rota para #/admin
  const [currentRoute, setCurrentRoute] = useState<'form' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      if (hash === '#/admin' || hash === '#admin' || pathname === '/admin') {
        return 'admin';
      }
    }
    return 'form';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      if (hash === '#/admin' || hash === '#admin' || pathname === '/admin') {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('form');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigateToForm = () => {
    window.location.hash = '';
    if (window.location.pathname === '/admin') {
      window.history.pushState(null, '', '/');
    }
    setCurrentRoute('form');
  };

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
    if (errorMessage) setErrorMessage(null);
  };

  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const yOffset = -90; // offset do cabeçalho fixo
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });

      // Se for input de texto, foca no elemento após rolar
      const inputEl = element.querySelector('input');
      if (inputEl) {
        setTimeout(() => inputEl.focus(), 300);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'whatsapp') {
      finalValue = maskPhone(value);
    }
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    clearFieldError(name);
  };

  const handleSelectAcompanhadoCriancas = (val: 'Sim' | 'Não') => {
    setFormData((prev) => ({
      ...prev,
      acompanhadoCriancas: val,
      // Limpa dados de crianças se selecionar Não
      qtdCriancas: val === 'Não' ? '' : prev.qtdCriancas,
      qtdCriancasOutra: val === 'Não' ? '' : prev.qtdCriancasOutra,
      faixasEtariasCriancas: val === 'Não' ? [] : prev.faixasEtariasCriancas,
    }));
    clearFieldError('acompanhadoCriancas');
  };

  const handleSelectQtdCriancas = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      qtdCriancas: val,
      qtdCriancasOutra: val === 'outra quantidade' ? prev.qtdCriancasOutra : '',
    }));
    clearFieldError('qtdCriancas');
  };

  const handleToggleFaixaEtariaCrianca = (faixa: string) => {
    setFormData((prev) => {
      const exists = prev.faixasEtariasCriancas.includes(faixa);
      const newFaixas = exists
        ? prev.faixasEtariasCriancas.filter((f) => f !== faixa)
        : [...prev.faixasEtariasCriancas, faixa];
      return { ...prev, faixasEtariasCriancas: newFaixas };
    });
    clearFieldError('faixasEtariasCriancas');
  };

  const handleSelectPcd = (val: 'Não' | 'Sim') => {
    setFormData((prev) => ({
      ...prev,
      pcd: val,
      pcdQual: val === 'Não' ? '' : prev.pcdQual,
    }));
    clearFieldError('pcd');
  };

  const handleSelectAcessibilidade = (val: 'Não' | 'Sim') => {
    setFormData((prev) => ({
      ...prev,
      necessitaAcessibilidade: val,
      acessibilidadeQual: val === 'Não' ? '' : prev.acessibilidadeQual,
    }));
    clearFieldError('necessitaAcessibilidade');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const errors: Record<string, string> = {};
    let firstErrorElementId: string | null = null;

    const setError = (field: string, elementId: string, msg: string) => {
      errors[field] = msg;
      if (!firstErrorElementId) {
        firstErrorElementId = elementId;
      }
    };

    // 1. Nome completo do responsável
    if (!formData.nome.trim()) {
      setError('nome', 'campo-pergunta-1', 'Por favor, informe o nome completo do responsável.');
    }

    // 2. WhatsApp para contato
    const cleanPhone = formData.whatsapp.replace(/\D/g, '');
    if (!formData.whatsapp.trim()) {
      setError('whatsapp', 'campo-pergunta-2', 'Por favor, informe seu WhatsApp para contato.');
    } else if (cleanPhone.length < 10) {
      setError('whatsapp', 'campo-pergunta-2', 'Por favor, informe um WhatsApp válido com DDD (ex: (19) 99999-9999).');
    }

    // 3. Em qual cidade você mora?
    if (!formData.cidade.trim()) {
      setError('cidade', 'campo-pergunta-3', 'Por favor, informe a cidade em que você mora.');
    }

    // 4. Você está acompanhado(a) de criança(s)?
    if (!formData.acompanhadoCriancas) {
      setError('acompanhadoCriancas', 'campo-pergunta-4', 'Por favor, selecione se você está acompanhado(a) de criança(s).');
    }

    // 5 & 6. Se Sim para crianças
    if (formData.acompanhadoCriancas === 'Sim') {
      if (!formData.qtdCriancas) {
        setError('qtdCriancas', 'campo-pergunta-5', 'Por favor, informe quantas crianças estão com você.');
      } else if (formData.qtdCriancas === 'outra quantidade' && !formData.qtdCriancasOutra.trim()) {
        setError('qtdCriancasOutra', 'campo-pergunta-5', 'Por favor, especifique a quantidade de crianças no campo.');
      }

      if (formData.faixasEtariasCriancas.length === 0) {
        setError('faixasEtariasCriancas', 'campo-pergunta-6', 'Por favor, selecione ao menos uma faixa etária correspondente.');
      }
    }

    // 7. PCD
    if (!formData.pcd) {
      setError('pcd', 'campo-pergunta-7', 'Por favor, informe se algum participante é pessoa com deficiência (PCD).');
    } else if (formData.pcd === 'Sim' && !formData.pcdQual.trim()) {
      setError('pcdQual', 'campo-pergunta-7', 'Por favor, especifique qual deficiência ou necessidade específica.');
    }

    // 8. Necessita de recurso de acessibilidade
    if (!formData.necessitaAcessibilidade) {
      setError('necessitaAcessibilidade', 'campo-pergunta-8', 'Por favor, informe se necessita de cadeira de rodas ou outro recurso de acessibilidade.');
    } else if (formData.necessitaAcessibilidade === 'Sim' && !formData.acessibilidadeQual.trim()) {
      setError('acessibilidadeQual', 'campo-pergunta-8', 'Por favor, especifique qual recurso de acessibilidade é necessário.');
    }

    // Se houver algum erro de preenchimento
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Atenção: existem campos obrigatórios não preenchidos. Veja abaixo:');
      if (firstErrorElementId) {
        scrollToElement(firstErrorElementId);
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const qtdCriancasTexto = formData.acompanhadoCriancas === 'Sim'
        ? (formData.qtdCriancas === 'outra quantidade' ? (formData.qtdCriancasOutra.trim() || 'Outra') : formData.qtdCriancas)
        : '0';

      const faixasEtariasTexto = formData.acompanhadoCriancas === 'Sim'
        ? formData.faixasEtariasCriancas.join(', ')
        : 'Não aplicável (sem crianças)';

      const pcdTexto = formData.pcd === 'Sim'
        ? `Sim (${formData.pcdQual.trim()})`
        : 'Não';

      const acessibilidadeTexto = formData.necessitaAcessibilidade === 'Sim'
        ? `Sim (${formData.acessibilidadeQual.trim()})`
        : 'Não';

      // Grava no Firestore através de transação com contador sequencial
      let finalSequentialNum = 1;

      try {
        const result = await runTransaction(db, async (transaction) => {
          const counterDocRef = doc(db, 'config', 'registrationCounter');
          const counterDoc = await transaction.get(counterDocRef);

          let currentCount = 0;
          if (counterDoc.exists()) {
            currentCount = counterDoc.data()?.count || 0;
          }

          const newCount = currentCount + 1;
          transaction.set(counterDocRef, { count: newCount }, { merge: true });

          const leadRef = doc(collection(db, 'inscricoes'));
          transaction.set(leadRef, {
            ...formData,
            qtdCriancasTexto,
            faixasEtariasTexto,
            pcdTexto,
            acessibilidadeTexto,
            numeroInscricao: newCount,
            comunidade: 'Destinos do Bem',
            createdAt: serverTimestamp(),
          });

          return newCount;
        });
        finalSequentialNum = result;
      } catch (firestoreErr) {
        console.warn('Erro na transação Firestore, tentando gravação direta:', firestoreErr);
        finalSequentialNum = Date.now();
      }

      setIsSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Envia em segundo plano para a planilha Google Sheets via /api/submit
      fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Colunas padrão da planilha para compatibilidade garantida
          dataInscricao: new Date().toLocaleString('pt-BR'),
          numeroInscricao: `#${finalSequentialNum}`,
          nome: formData.nome,
          faixaEtaria: formData.acompanhadoCriancas === 'Sim'
            ? `${qtdCriancasTexto} criança(s) [${faixasEtariasTexto}]`
            : 'Sem crianças',
          pcd: pcdTexto,
          necessitaAcessibilidade: formData.necessitaAcessibilidade,
          acessibilidadeQual: formData.acessibilidadeQual.trim(),
          whatsapp: formData.whatsapp,
          cidade: formData.cidade,
          // Propriedades enriquecidas
          acompanhadoCriancas: formData.acompanhadoCriancas,
          qtdCriancas: qtdCriancasTexto,
          faixasEtariasCriancas: faixasEtariasTexto,
          pcdQual: formData.pcdQual.trim(),
        }),
      }).catch((sheetError) => {
        console.error('Erro de conexão ao salvar na planilha:', sheetError);
      });

    } catch (err) {
      console.error('Erro ao processar cadastro:', err);
      setErrorMessage('Ocorreu um erro ao processar seu cadastro. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rota administrativa para gerar o QR Code (/#/admin ou /admin)
  if (currentRoute === 'admin') {
    return <AdminQRView onBackToForm={navigateToForm} />;
  }

  // 💚 TELA DE ENCERRAMENTO (Confirmação com link para o WhatsApp da Comunidade)
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-emerald-50/50 flex items-center justify-center p-4 font-sans selection:bg-emerald-200">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-100 text-slate-800"
        >
          {/* Top Banner */}
          <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-green-900 p-8 text-center text-white relative">
            <div className="flex justify-center mb-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="bg-white/20 p-4 rounded-full backdrop-blur-md shadow-inner border border-white/30"
              >
                <CheckCircle2 className="w-14 h-14 text-emerald-300" />
              </motion.div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-emerald-100 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inscrição Confirmada</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pronto! Seu cadastro foi realizado!
            </h1>
          </div>

          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="space-y-4 text-slate-600 text-base sm:text-lg leading-relaxed text-left bg-emerald-50/60 p-5 rounded-2xl border border-emerald-100/80">
              <p>
                Agora você faz parte da <strong>Comunidade Destinos do Bem</strong> e poderá acompanhar nossas experiências, novidades e oportunidades de viver momentos especiais com a gente.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 italic">
                Ao finalizar, você autoriza o Destinos do Bem a entrar em contato com você pelo WhatsApp informado, para enviar informações relacionadas à comunidade, aos eventos e às experiências do bem.
              </p>
            </div>

            <div className="pt-2">
              <p className="font-semibold text-slate-800 text-base sm:text-lg mb-4">
                📲 E para validar o seu cadastro, entre agora mesmo na nossa comunidade do WhatsApp:
              </p>

              <a 
                href="https://chat.whatsapp.com/JYjy6PpsovgIknc95f5LFf?s=cl&p=a&mlu=4&ilr=4"
                target="_blank"
                rel="noopener noreferrer"
                id="btn-entrar-comunidade-whatsapp"
                className="inline-flex items-center justify-center gap-3 w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-base sm:text-lg font-bold rounded-2xl transition-all shadow-xl hover:shadow-emerald-600/30 group"
              >
                <span>👉 CLIQUE AQUI PARA ENTRAR NA COMUNIDADE</span>
                <ExternalLink className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xl sm:text-2xl font-black text-emerald-700">
                Vemmmm comigo! 💚✨
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Top Header Navigation Bar (sem ícone de mundo e sem botão de instalar app) */}
      <header className="sticky top-0 z-40 bg-emerald-800/95 backdrop-blur-md border-b border-emerald-700/50 text-white py-2.5 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img 
              src="/app-icon.jpg" 
              alt="Destinos do Bem" 
              className="w-8 h-8 rounded-full object-cover border border-white/40 shadow-xs shrink-0" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://i.ibb.co/nqDTXjS6/Whats-App-Image-2026-09-27-at-8-51-22-AM.jpg';
              }}
            />
            <span className="font-bold text-sm sm:text-base tracking-tight truncate">
              COMUNIDADE DESTINOS DO BEM
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section with Header Image & Text */}
      <div className="relative w-full overflow-hidden bg-[#07331d] pt-1 pb-6 sm:py-0 sm:h-[340px] md:h-[360px]">
        {/* On mobile: displayed with object-contain so 100% of the graphic and text are visible without cropping */}
        <div className="w-full max-w-2xl mx-auto sm:max-w-none sm:absolute sm:inset-0 sm:h-full">
          <img 
            src="https://i.ibb.co/WvNLbS2Q/topo-sistema.png" 
            alt="Comunidade Destinos do Bem" 
            className="w-full h-auto sm:h-full object-contain sm:object-cover object-top"
            referrerPolicy="no-referrer"
          />
        </div>
        
        {/* Soft emerald overlay on desktop */}
        <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/45 to-emerald-950/10 pointer-events-none" />
        
        <div className="relative sm:absolute sm:inset-0 sm:flex sm:items-end sm:justify-center sm:pb-16 px-4 pt-2 sm:pt-0 text-center">
          <div className="max-w-2xl w-full text-center mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-1.5"
            >
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight drop-shadow-md">
                COMUNIDADE DESTINOS DO BEM
              </h1>
              
              <p className="text-xs sm:text-sm md:text-base text-emerald-100/90 font-medium max-w-xl mx-auto drop-shadow-sm">
                Um passaporte para experiências que fazem o bem.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 py-8 -mt-6 sm:-mt-8 relative z-10 space-y-8">
        
        {/* 💚 ABERTURA */}
        <motion.section 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-emerald-100 relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-50 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
              <Heart className="w-6 h-6 fill-emerald-600 text-emerald-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase">Boas-vindas</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Que bom ter você aqui! 💚
              </h2>
            </div>
          </div>

          <div className="space-y-3.5 text-slate-600 text-base leading-relaxed">
            <p>
              Ao se cadastrar, você passa a fazer parte da <strong>Comunidade Destinos do Bem</strong>, criada para conectar crianças, famílias e pessoas que acreditam que boas experiências podem inspirar, ensinar e transformar.
            </p>
            
            <p className="font-semibold text-emerald-800 bg-emerald-50/80 px-4 py-2.5 rounded-xl border border-emerald-100/80">
              ⚡ O preenchimento é rapidinho!
            </p>
            
            <p>
              Essas informações vão nos ajudar a conhecer melhor você e a preparar nossas próximas Experiências do Bem com carinho, cuidado e segurança.
            </p>

            <div className="pt-2 text-slate-800 font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Cadastre-se e venha viver essa jornada com a gente.</span>
            </div>

            <p className="text-lg font-black text-emerald-700 pt-1">
              Vem Comigo!
            </p>
          </div>
        </motion.section>

        {/* 📝 FORMULÁRIO DE INSCRIÇÃO */}
        <motion.section 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
        >
          <div className="p-6 sm:p-8 bg-gradient-to-r from-emerald-800 to-green-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                <Users className="w-6 h-6 text-emerald-200" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black">
                  📝 FORMULÁRIO DE INSCRIÇÃO
                </h2>
                <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
                  Preencha seus dados para ingressar na comunidade
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-7">
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl flex items-start gap-3 text-red-800 text-sm shadow-sm"
              >
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{errorMessage}</span>
              </motion.div>
            )}

            {/* 1. Nome completo do responsável * */}
            <div 
              id="campo-pergunta-1" 
              className={cn(
                "p-4 rounded-2xl transition-all border",
                fieldErrors.nome 
                  ? "bg-red-50/50 border-red-300 ring-2 ring-red-400" 
                  : "bg-transparent border-transparent"
              )}
            >
              <label htmlFor="nome" className="block text-sm font-bold text-slate-800 mb-1">
                1. Nome completo do responsável <span className="text-emerald-600">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">Resposta curta</p>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="nome"
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Nome completo do responsável"
                  className={cn(
                    "w-full pl-11 pr-4 py-3.5 rounded-2xl transition-all text-slate-900 border",
                    fieldErrors.nome
                      ? "bg-white border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white"
                  )}
                />
              </div>
              {fieldErrors.nome && (
                <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fieldErrors.nome}</span>
                </p>
              )}
            </div>

            {/* 2. WhatsApp para contato * */}
            <div 
              id="campo-pergunta-2" 
              className={cn(
                "p-4 rounded-2xl transition-all border",
                fieldErrors.whatsapp 
                  ? "bg-red-50/50 border-red-300 ring-2 ring-red-400" 
                  : "bg-transparent border-transparent"
              )}
            >
              <label htmlFor="whatsapp" className="block text-sm font-bold text-slate-800 mb-1">
                2. WhatsApp para contato <span className="text-emerald-600">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">Resposta curta</p>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="whatsapp"
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                  className={cn(
                    "w-full pl-11 pr-4 py-3.5 rounded-2xl transition-all text-slate-900 border",
                    fieldErrors.whatsapp
                      ? "bg-white border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white"
                  )}
                />
              </div>
              {fieldErrors.whatsapp && (
                <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fieldErrors.whatsapp}</span>
                </p>
              )}
            </div>

            {/* 3. Em qual cidade você mora? * */}
            <div 
              id="campo-pergunta-3" 
              className={cn(
                "p-4 rounded-2xl transition-all border",
                fieldErrors.cidade 
                  ? "bg-red-50/50 border-red-300 ring-2 ring-red-400" 
                  : "bg-transparent border-transparent"
              )}
            >
              <label htmlFor="cidade" className="block text-sm font-bold text-slate-800 mb-1">
                3. Em qual cidade você mora? <span className="text-emerald-600">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">Resposta curta</p>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="cidade"
                  type="text"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleInputChange}
                  placeholder="Ex: Americana, Nova Odessa, Santa Bárbara D´Oeste..."
                  className={cn(
                    "w-full pl-11 pr-4 py-3.5 rounded-2xl transition-all text-slate-900 border",
                    fieldErrors.cidade
                      ? "bg-white border-red-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      : "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white"
                  )}
                />
              </div>
              {fieldErrors.cidade && (
                <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fieldErrors.cidade}</span>
                </p>
              )}
            </div>

            {/* SEÇÃO: 👱‍♀️ SOBRE AS CRIANÇAS */}
            <div className="pt-4 border-t border-slate-200/80">
              <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800 mb-4 bg-emerald-50/80 px-4 py-3 rounded-2xl border border-emerald-100">
                <span className="text-xl">👱‍♀️</span>
                <span className="tracking-wide uppercase text-emerald-950 font-black">SOBRE AS CRIANÇAS</span>
              </div>

              {/* 4. Você está acompanhado(a) de criança(s)? */}
              <div 
                id="campo-pergunta-4" 
                className={cn(
                  "p-4 rounded-2xl transition-all border space-y-2",
                  fieldErrors.acompanhadoCriancas 
                    ? "bg-red-50/50 border-red-300 ring-2 ring-red-400" 
                    : "bg-transparent border-transparent"
                )}
              >
                <label className="block text-sm font-bold text-slate-800">
                  4. Você está acompanhado(a) de criança(s)? <span className="text-emerald-600">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">(somente 1 seleção)</p>
                
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  {(['Sim', 'Não'] as const).map((val) => {
                    const isSelected = formData.acompanhadoCriancas === val;
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() => handleSelectAcompanhadoCriancas(val)}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-sm font-semibold cursor-pointer",
                          isSelected
                            ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                            : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                          isSelected 
                            ? "bg-emerald-600 border-emerald-600 text-white" 
                            : "border-slate-300 bg-white"
                        )}>
                          {isSelected && <span className="text-xs font-bold leading-none">✓</span>}
                        </div>
                        <span>{val}</span>
                      </button>
                    );
                  })}
                </div>

                {fieldErrors.acompanhadoCriancas && (
                  <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5 animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fieldErrors.acompanhadoCriancas}</span>
                  </p>
                )}
              </div>

              {/* Condicional para perguntas 5 e 6 se estiver acompanhado(a) de crianças */}
              <AnimatePresence>
                {formData.acompanhadoCriancas === 'Sim' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-6 pt-5"
                  >
                    {/* 5. Quantas crianças estão com você? */}
                    <div 
                      id="campo-pergunta-5" 
                      className={cn(
                        "p-4 rounded-2xl border transition-all space-y-3",
                        (fieldErrors.qtdCriancas || fieldErrors.qtdCriancasOutra)
                          ? "bg-red-50/60 border-red-300 ring-2 ring-red-400"
                          : "bg-emerald-50/40 border-emerald-100/90"
                      )}
                    >
                      <label className="block text-sm font-bold text-slate-800">
                        5. Quantas crianças estão com você? <span className="text-emerald-600">*</span>
                      </label>
                      <p className="text-xs text-slate-500">(somente 1 seleção, com texto em outra quantidade)</p>

                      <div className="space-y-2">
                        {['1', '2', '3', '4'].map((num) => {
                          const isSelected = formData.qtdCriancas === num;
                          return (
                            <button
                              type="button"
                              key={num}
                              onClick={() => handleSelectQtdCriancas(num)}
                              className={cn(
                                "flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all text-sm font-medium cursor-pointer",
                                isSelected
                                  ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold ring-1 ring-emerald-600"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                                isSelected 
                                  ? "bg-emerald-600 border-emerald-600 text-white" 
                                  : "border-slate-300 bg-white"
                              )}>
                                {isSelected && <span className="text-[10px] font-bold">✓</span>}
                              </div>
                              <span>{num}</span>
                            </button>
                          );
                        })}

                        {/* Opção outra quantidade */}
                        <div className={cn(
                          "p-3 rounded-xl border transition-all space-y-2.5",
                          formData.qtdCriancas === 'outra quantidade'
                            ? "bg-emerald-50 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        )}>
                          <button
                            type="button"
                            onClick={() => handleSelectQtdCriancas('outra quantidade')}
                            className="flex items-center gap-3 w-full text-left font-medium text-sm cursor-pointer"
                          >
                            <div className={cn(
                              "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                              formData.qtdCriancas === 'outra quantidade'
                                ? "bg-emerald-600 border-emerald-600 text-white" 
                                : "border-slate-300 bg-white"
                            )}>
                              {formData.qtdCriancas === 'outra quantidade' && <span className="text-[10px] font-bold">✓</span>}
                            </div>
                            <span>outra quantidade ___</span>
                          </button>

                          {formData.qtdCriancas === 'outra quantidade' && (
                            <input
                              type="text"
                              name="qtdCriancasOutra"
                              value={formData.qtdCriancasOutra}
                              onChange={handleInputChange}
                              placeholder="Digite a quantidade de crianças..."
                              className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm text-slate-900"
                              autoFocus
                            />
                          )}
                        </div>
                      </div>

                      {(fieldErrors.qtdCriancas || fieldErrors.qtdCriancasOutra) && (
                        <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5 animate-pulse">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{fieldErrors.qtdCriancas || fieldErrors.qtdCriancasOutra}</span>
                        </p>
                      )}
                    </div>

                    {/* 6. Qual a faixa etária da(s) criança(s)? */}
                    <div 
                      id="campo-pergunta-6" 
                      className={cn(
                        "p-4 rounded-2xl border transition-all space-y-2",
                        fieldErrors.faixasEtariasCriancas
                          ? "bg-red-50/60 border-red-300 ring-2 ring-red-400"
                          : "bg-emerald-50/40 border-emerald-100/90"
                      )}
                    >
                      <label className="block text-sm font-bold text-slate-800">
                        6. Qual a faixa etária da(s) criança(s)? <span className="text-emerald-600">*</span>
                      </label>
                      <p className="text-xs text-slate-500">(permitir multiplas seleções)</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {FAIXAS_ETARIAS_CRIANCAS.map((faixa) => {
                          const isSelected = formData.faixasEtariasCriancas.includes(faixa);
                          return (
                            <button
                              type="button"
                              key={faixa}
                              onClick={() => handleToggleFaixaEtariaCrianca(faixa)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border text-left transition-all text-sm font-medium cursor-pointer",
                                isSelected
                                  ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold ring-1 ring-emerald-600"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                                isSelected 
                                  ? "bg-emerald-600 border-emerald-600 text-white" 
                                  : "border-slate-300 bg-white"
                              )}>
                                {isSelected && <span className="text-[10px] font-bold">✓</span>}
                              </div>
                              <span>{faixa}</span>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-xs text-slate-500 pt-1 leading-relaxed italic">
                        Se estiver acompanhado(a) de mais de uma criança, selecione todas as faixas etárias correspondentes.
                      </p>

                      {fieldErrors.faixasEtariasCriancas && (
                        <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5 animate-pulse">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{fieldErrors.faixasEtariasCriancas}</span>
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SEÇÃO: ♿ ACESSIBILIDADE */}
            <div className="pt-4 border-t border-slate-200/80 space-y-6">
              <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-800 mb-4 bg-emerald-50/80 px-4 py-3 rounded-2xl border border-emerald-100">
                <span className="text-xl">♿</span>
                <span className="tracking-wide uppercase text-emerald-950 font-black">ACESSIBILIDADE</span>
              </div>

              {/* 7. Algum participante é pessoa com deficiência (PCD)? */}
              <div 
                id="campo-pergunta-7" 
                className={cn(
                  "p-4 rounded-2xl transition-all border space-y-3",
                  (fieldErrors.pcd || fieldErrors.pcdQual)
                    ? "bg-red-50/50 border-red-300 ring-2 ring-red-400"
                    : "bg-transparent border-transparent"
                )}
              >
                <label className="block text-sm font-bold text-slate-800">
                  7. Algum participante é pessoa com deficiência (PCD)? <span className="text-emerald-600">*</span>
                </label>

                <div className="space-y-2.5">
                  {/* Opção Não */}
                  <button
                    type="button"
                    onClick={() => handleSelectPcd('Não')}
                    className={cn(
                      "flex items-center gap-3 w-full p-3.5 rounded-2xl border text-left transition-all text-sm font-semibold cursor-pointer",
                      formData.pcd === 'Não'
                        ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                        : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                      formData.pcd === 'Não'
                        ? "bg-emerald-600 border-emerald-600 text-white" 
                        : "border-slate-300 bg-white"
                    )}>
                      {formData.pcd === 'Não' && <span className="text-xs font-bold leading-none">✓</span>}
                    </div>
                    <span>Não</span>
                  </button>

                  {/* Opção Sim */}
                  <div className={cn(
                    "p-3.5 rounded-2xl border transition-all space-y-2.5",
                    formData.pcd === 'Sim'
                      ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                      : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}>
                    <button
                      type="button"
                      onClick={() => handleSelectPcd('Sim')}
                      className="flex items-center gap-3 w-full text-left font-semibold text-sm cursor-pointer"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                        formData.pcd === 'Sim'
                          ? "bg-emerald-600 border-emerald-600 text-white" 
                          : "border-slate-300 bg-white"
                      )}>
                        {formData.pcd === 'Sim' && <span className="text-xs font-bold leading-none">✓</span>}
                      </div>
                      <span>Sim — qual deficiência ou necessidade específica? _____</span>
                    </button>

                    {formData.pcd === 'Sim' && (
                      <input
                        type="text"
                        name="pcdQual"
                        value={formData.pcdQual}
                        onChange={handleInputChange}
                        placeholder="Informe qual deficiência ou necessidade específica..."
                        className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm text-slate-900 font-normal"
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                {(fieldErrors.pcd || fieldErrors.pcdQual) && (
                  <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5 animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fieldErrors.pcd || fieldErrors.pcdQual}</span>
                  </p>
                )}
              </div>

              {/* 8. Algum participante necessita de cadeira de rodas ou outro recurso de acessibilidade? * */}
              <div 
                id="campo-pergunta-8" 
                className={cn(
                  "p-4 rounded-2xl transition-all border space-y-3",
                  (fieldErrors.necessitaAcessibilidade || fieldErrors.acessibilidadeQual)
                    ? "bg-red-50/50 border-red-300 ring-2 ring-red-400"
                    : "bg-transparent border-transparent"
                )}
              >
                <label className="block text-sm font-bold text-slate-800">
                  8. Algum participante necessita de cadeira de rodas ou outro recurso de acessibilidade? <span className="text-emerald-600">*</span>
                </label>

                <div className="space-y-2.5">
                  {/* Opção Não */}
                  <button
                    type="button"
                    onClick={() => handleSelectAcessibilidade('Não')}
                    className={cn(
                      "flex items-center gap-3 w-full p-3.5 rounded-2xl border text-left transition-all text-sm font-semibold cursor-pointer",
                      formData.necessitaAcessibilidade === 'Não'
                        ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                        : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                      formData.necessitaAcessibilidade === 'Não'
                        ? "bg-emerald-600 border-emerald-600 text-white" 
                        : "border-slate-300 bg-white"
                    )}>
                      {formData.necessitaAcessibilidade === 'Não' && <span className="text-xs font-bold leading-none">✓</span>}
                    </div>
                    <span>Não</span>
                  </button>

                  {/* Opção Sim */}
                  <div className={cn(
                    "p-3.5 rounded-2xl border transition-all space-y-2.5",
                    formData.necessitaAcessibilidade === 'Sim'
                      ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600"
                      : "bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}>
                    <button
                      type="button"
                      onClick={() => handleSelectAcessibilidade('Sim')}
                      className="flex items-center gap-3 w-full text-left font-semibold text-sm cursor-pointer"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                        formData.necessitaAcessibilidade === 'Sim'
                          ? "bg-emerald-600 border-emerald-600 text-white" 
                          : "border-slate-300 bg-white"
                      )}>
                        {formData.necessitaAcessibilidade === 'Sim' && <span className="text-xs font-bold leading-none">✓</span>}
                      </div>
                      <span>Sim — qual? _____</span>
                    </button>

                    {formData.necessitaAcessibilidade === 'Sim' && (
                      <div className="relative">
                        <Accessibility className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700" />
                        <input
                          type="text"
                          name="acessibilidadeQual"
                          value={formData.acessibilidadeQual}
                          onChange={handleInputChange}
                          placeholder="Informe qual recurso de acessibilidade..."
                          className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm text-slate-900 font-normal"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                </div>

                {(fieldErrors.necessitaAcessibilidade || fieldErrors.acessibilidadeQual) && (
                  <p className="mt-2 text-xs font-semibold text-red-600 flex items-center gap-1.5 animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fieldErrors.necessitaAcessibilidade || fieldErrors.acessibilidadeQual}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Botão de envio */}
            <div className="pt-4">
              <button
                disabled={isSubmitting}
                type="submit"
                id="btn-cadastrar-comunidade"
                className={cn(
                  "w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-base sm:text-lg rounded-2xl transition-all shadow-xl hover:shadow-emerald-600/30 flex items-center justify-center gap-2.5 group cursor-pointer",
                  isSubmitting && "opacity-75 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enviando cadastro...
                  </span>
                ) : (
                  <>
                    <span>CADASTRAR NA COMUNIDADE</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.section>
      </main>

      {/* Footer (sem ícone de mundo) */}
      <footer className="bg-emerald-950 text-emerald-200 py-10 px-4 mt-12 border-t border-emerald-900">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          {/* Logo e Título Centralizados */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 text-center sm:text-left">
            <img 
              src="/app-icon.jpg" 
              alt="Logo Destinos do Bem" 
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50 shadow-md shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://i.ibb.co/nqDTXjS6/Whats-App-Image-2026-09-27-at-8-51-22-AM.jpg';
              }}
            />
            <div className="text-center sm:text-left">
              <p className="font-bold text-white text-base">COMUNIDADE DESTINOS DO BEM</p>
              <p className="text-xs text-emerald-300">Experiências que fazem o bem</p>
            </div>
          </div>
          
          <p className="text-xs sm:text-sm text-emerald-300/80 max-w-md mx-auto text-center">
            Conectando pessoas através de vivências positivas, aprendizado, empatia e transformação social.
          </p>

          {/* Desenvolvido por - EBCB */}
          <div className="pt-6 border-t border-emerald-900/60 flex flex-col items-center justify-center space-y-3">
            <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-emerald-400/90 uppercase">
              DESENVOLVIDO POR
            </p>
            <a 
              href="https://easybyzcreator.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block transition-transform hover:scale-105"
            >
              <img 
                src="https://i.ibb.co/bgc66ygJ/ebcb.png" 
                alt="Easy Byz Creator" 
                className="h-[108px] sm:h-[120px] w-auto object-contain mx-auto"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
