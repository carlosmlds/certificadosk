import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Calendar, PenTool, Image as ImageIcon, FileText, Loader, AlertCircle } from 'lucide-react';

// --- CONFIGURAÇÃO DE IMAGENS PADRÃO E AUTOMÁTICAS ---
// Mapeamento dos fundos fixos. As imagens devem estar em public/img_fundos/
const FUNDO_MAP = {
  '1 MÊS': '/img_fundos/fundo_1mes.jpg',
  '3 MESES': '/img_fundos/fundo_3meses.jpg',
  '6 MESES': '/img_fundos/fundo_6meses.jpg',
  '1 ANO': '/img_fundos/fundo_1ano.jpg',
  // 'OUTRO' não tem fundo automático, permite upload manual
};

const DEFAULT_LOGO_BOXK_URL = "";  
const DEFAULT_LOGO_KORPUS_URL = ""; 

// Utilitário para adicionar meses a uma data
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

// Formata data para PT-BR
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function App() {
  // Estados do formulário
  const [periodo, setPeriodo] = useState('1 MÊS');
  const [nomeEvento, setNomeEvento] = useState('');
  const [artigoEvento, setArtigoEvento] = useState('ao');
  const [plano, setPlano] = useState('ouro'); // 'ouro' ou 'box_k'
  const [dataRetirada, setDataRetirada] = useState(new Date().toISOString().split('T')[0]);
  
  // Estados de Imagens
  const [logoKorpus, setLogoKorpus] = useState(DEFAULT_LOGO_KORPUS_URL || null);
  const [logoBoxK, setLogoBoxK] = useState(DEFAULT_LOGO_BOXK_URL || null);
  // Inicia o fundo com o correspondente ao período inicial (1 MÊS)
  const [fundoCertificado, setFundoCertificado] = useState(FUNDO_MAP['1 MÊS'] || null);

  // Estado de carregamento para download
  const [isGenerating, setIsGenerating] = useState(false);

  // Referência para exportação
  const certificateRef = useRef(null);

  // Carregar bibliotecas externas para PDF e JPG
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    ]).then(() => {
      console.log('Bibliotecas de exportação carregadas');
    }).catch(err => console.error('Erro ao carregar bibliotecas', err));
  }, []);

  // --- EFEITO DE TROCA AUTOMÁTICA DE FUNDO ---
  useEffect(() => {
    const novoFundoAutomatico = FUNDO_MAP[periodo];
    // Se existir um fundo mapeado para este período, atualiza.
    // Se for 'OUTRO', não faz nada automaticamente, mantendo o que estiver (ou permitindo upload manual).
    if (novoFundoAutomatico) {
      setFundoCertificado(novoFundoAutomatico);
    }
  }, [periodo]);

  // Lógica da Data Final
  const dataFinal = formatDate(addMonths(dataRetirada, 1).toISOString().split('T')[0]);
  const dataRetiradaFormatada = formatDate(dataRetirada);

  // Lógica de Gramática
  useEffect(() => {
    if (!nomeEvento) return;
    
    const primeiroNome = nomeEvento.split(' ')[0].toLowerCase();
    const femininas = ['corrida', 'maratona', 'semana', 'jornada', 'aula', 'sessão', 'gincana', 'festa', 'confraternização', 'caminhada'];
    
    if (femininas.includes(primeiroNome) || (primeiroNome.endsWith('a') && !['dia', 'cinema', 'programa'].includes(primeiroNome))) {
      setArtigoEvento('à');
    } else {
      setArtigoEvento('ao');
    }
  }, [nomeEvento]);

  const getPeriodoExtenso = (p) => {
    const map = {
      '1 MÊS': 'um mês',
      '3 MESES': 'três meses',
      '6 MESES': 'seis meses',
      '1 ANO': 'um ano',
      'OUTRO': 'período'
    };
    return map[p] || p.toLowerCase();
  };

  // Lógica de Formatação do Nome do Evento (Title Case ou All Caps)
  const formatarNomeEvento = (texto) => {
    if (!texto) return '';
    if (texto === texto.toUpperCase() && texto.trim().length > 0) {
      return texto;
    }
    const excecoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'a', 'o', 'as', 'os', 'ao', 'aos', 'à', 'às'];
    
    return texto.toLowerCase().split(' ').map((palavra, index) => {
      if (index > 0 && excecoes.includes(palavra)) {
        return palavra;
      }
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    }).join(' ');
  };

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (x) => setter(x.target.result);
      reader.readAsDataURL(file);
    }
  };

  // --- FUNÇÕES DE DOWNLOAD ---

  const prepareCanvas = async () => {
    if (!window.html2canvas) throw new Error("Biblioteca html2canvas não carregada.");
    
    // Com o fundo fixo, não precisamos mais manipular o gradiente do texto do selo
    const canvas = await window.html2canvas(certificateRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    return canvas;
  };

  const downloadJPG = async () => {
    setIsGenerating(true);
    try {
      const canvas = await prepareCanvas();
      const image = canvas.toDataURL("image/jpeg", 1.0);
      const link = document.createElement('a');
      link.download = `Certificado-${periodo.replace(' ', '-')}-${nomeEvento || 'Evento'}.jpg`;
      link.href = image;
      link.click();
    } catch (error) {
      console.error("Erro ao gerar JPG:", error);
      alert("Erro ao gerar imagem. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      const canvas = await prepareCanvas();
      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      if (!window.jspdf) throw new Error("Biblioteca jspdf não carregada.");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Certificado-${periodo.replace(' ', '-')}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col md:flex-row">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        
        .font-bebas { font-family: 'Bebas Neue', cursive; font-weight: 400; }
        .font-garamond { font-family: 'EB Garamond', serif; }
        
        @media print {
          .no-print { display: none !important; }
          .print-area { 
            transform: scale(1) !important; 
            width: 100% !important;
            height: 100vh !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always;
          }
          body { background: white; }
          @page { size: landscape; margin: 0; }
        }
      `}</style>

      {/* --- MENU LATERAL (Esquerda) --- */}
      <div className="no-print w-full md:w-1/3 lg:w-1/4 bg-white p-6 shadow-lg overflow-y-auto z-10 border-r border-gray-200 h-screen sticky top-0">
        <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
          <PenTool size={24} /> Editor
        </h2>

        <div className="space-y-5">
          {/* Dados do Certificado */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Período</label>
              <select 
                value={periodo} 
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="1 MÊS">1 MÊS (Fundo Automático)</option>
                <option value="3 MESES">3 MESES (Fundo Automático)</option>
                <option value="6 MESES">6 MESES (Fundo Automático)</option>
                <option value="1 ANO">1 ANO (Fundo Automático)</option>
                <option value="OUTRO">OUTRO (Upload Manual)</option>
              </select>
              {periodo !== 'OUTRO' && (
                <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> O fundo muda automaticamente.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Evento</label>
              <input 
                type="text" 
                value={nomeEvento}
                onChange={(e) => setNomeEvento(e.target.value)}
                placeholder="Ex: Desafio Novembro Azul"
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                *Maiúsculas automáticas, exceto se escrever TUDO MAIÚSCULO (siglas).
              </p>
            </div>

            <div className="flex gap-2">
              <div className="w-1/3">
                 <label className="block text-xs text-gray-500 mb-1">Preposição</label>
                 <select value={artigoEvento} onChange={(e) => setArtigoEvento(e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-sm">
                   <option value="ao">ao</option>
                   <option value="à">à</option>
                 </select>
              </div>
              <div className="flex-1">
                 <label className="block text-xs text-gray-500 mb-1">Plano</label>
                 <div className="flex border rounded overflow-hidden">
                    <button onClick={() => setPlano('ouro')} className={`flex-1 py-2 text-xs font-medium ${plano === 'ouro' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Ouro</button>
                    <button onClick={() => setPlano('box_k')} className={`flex-1 py-2 text-xs font-medium ${plano === 'box_k' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Box K</button>
                 </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Calendar size={14} /> Data de Retirada
              </label>
              <input 
                type="date" 
                value={dataRetirada}
                onChange={(e) => setDataRetirada(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          {/* Seção de Uploads (Logos e Fundo Manual) */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-6">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Upload size={14}/> Uploads & Logos
            </h3>
            
            <div className="space-y-3">
              {/* Upload de fundo manual só aparece se for OUTRO */}
              {periodo === 'OUTRO' && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Imagem de Fundo (Manual)</label>
                  <input type="file" className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept="image/*" onChange={(e) => handleImageUpload(e, setFundoCertificado)} />
                  <p className="text-[10px] text-orange-600 mt-1">Use um fundo que já contenha o selo.</p>
                </div>
              )}
              
              <div>
                 <label className="block text-xs text-gray-600 mb-1">Logo Box K (Opcional)</label>
                 <input type="file" className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" accept="image/*" onChange={(e) => handleImageUpload(e, setLogoBoxK)} />
              </div>

               <div>
                 <label className="block text-xs text-gray-600 mb-1">Logo Korpus (Opcional)</label>
                 <input type="file" className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" accept="image/*" onChange={(e) => handleImageUpload(e, setLogoKorpus)} />
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-2 border-t mt-4">
             <h3 className="text-sm font-bold text-gray-700">Exportar</h3>
             
             <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={downloadPDF}
                  disabled={isGenerating || !fundoCertificado}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded shadow flex items-center justify-center gap-1 transition text-sm disabled:opacity-50"
                >
                  {isGenerating ? <Loader size={14} className="animate-spin"/> : <FileText size={16} />} 
                  Baixar PDF
                </button>

                <button 
                  onClick={downloadJPG}
                  disabled={isGenerating || !fundoCertificado}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded shadow flex items-center justify-center gap-1 transition text-sm disabled:opacity-50"
                >
                  {isGenerating ? <Loader size={14} className="animate-spin"/> : <ImageIcon size={16} />} 
                  Baixar JPG
                </button>
             </div>
             
             <button 
               onClick={() => window.print()}
               disabled={!fundoCertificado}
               className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded shadow flex items-center justify-center gap-2 transition text-xs disabled:opacity-50"
             >
               <Download size={14} /> Imprimir (Nativo)
             </button>
          </div>
        </div>
      </div>

      {/* --- ÁREA DE PRÉ-VISUALIZAÇÃO (Direita) --- */}
      <div className="flex-1 bg-gray-300 flex items-center justify-center p-4 md:p-8 overflow-auto">
        
        <div 
          ref={certificateRef}
          className="print-area relative bg-white shadow-2xl overflow-hidden text-black flex-shrink-0"
          style={{ width: '1123px', height: '794px' }} 
        >
          {/* BACKGROUND */}
          {fundoCertificado ? (
            <img 
              src={fundoCertificado} 
              alt="Fundo do Certificado" 
              className="absolute inset-0 w-full h-full object-cover z-0"
              // Adiciona um tratamento de erro caso a imagem não seja encontrada na pasta public
              onError={(e) => {
                e.target.onerror = null; 
                e.target.src = "https://via.placeholder.com/1123x794?text=Imagem+de+Fundo+N%C3%A3o+Encontrada+(Verifique+a+pasta+public/img_fundos)";
              }}
            />
          ) : (
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-10 border-4 border-dashed border-gray-300 m-4 rounded-xl">
              <ImageIcon size={48} className="mb-4 opacity-50"/>
              <p className="text-xl font-semibold">Aguardando Fundo...</p>
              <p className="text-sm mt-2">Selecione um período ou faça upload manual se for "OUTRO".</p>
              <p className="text-xs mt-4 text-red-400">Certifique-se de que as imagens estão na pasta <code>public/img_fundos</code>.</p>
            </div>
          )}

          {/* O SELO DINÂMICO FOI REMOVIDO POIS JÁ ESTÁ NA IMAGEM DE FUNDO */}

          {/* TEXTOS */}
          <div className="absolute top-0 right-0 w-[65%] h-full flex flex-col pt-16 pr-20 pb-10 text-right z-20">
            
            {/* Espaço do Título "Certificado" (Oculto se tiver fundo, pois já está na imagem) */}
            <div className="mb-14 flex flex-col items-end h-24 justify-center">
               {!fundoCertificado && <span className="font-garamond italic font-bold text-8xl tracking-tighter mr-4 text-black">Certificado</span>}
            </div>

            <div className="mt-8 space-y-2">
              <h2 className="font-garamond text-[33.7pt] uppercase tracking-normal text-gray-900 mb-2">
                PARABÉNS!
              </h2>
              <p className="font-garamond text-2xl text-black mb-10">
                Você agora faz parte da família Korpus!
              </p>

              <div className="font-garamond text-[20pt] leading-snug text-gray-800 w-[90%] ml-auto">
                Este certificado contempla {getPeriodoExtenso(periodo)} de Academia Korpus no{' '}
                <span className="font-bold">
                  {plano === 'ouro' ? 'Plano Ouro' : 'Plano Ouro Box K'}
                </span>{' '}
                como premiação {artigoEvento} <br/>
                <span className="font-bold text-2xl">{formatarNomeEvento(nomeEvento) || '................................'}</span>
              </div>
            </div>

            <div className="mt-8 font-garamond text-[11pt] text-gray-600 w-[80%] ml-auto leading-tight">
              *Bolsa intransferível. O resgate pode ser feito do dia <br/>
              <span className="font-bold">{dataRetiradaFormatada}</span> até <span className="font-bold">{dataFinal}</span> na recepção da unidade de sua escolha.
            </div>

            {/* RODAPÉ E LOGOS */}
            <div className="mt-auto pt-8 flex justify-end items-end gap-12 w-full h-32 relative">
               {/* Logos */}
               <div className="absolute bottom-6 right-0 flex items-center gap-6">
                  {/* Logo Box K - Lógica Automática se o plano for Box K */}
                  {plano === 'box_k' && (
                    <div className="h-16 w-32 flex items-center justify-center">
                      {logoBoxK ? (
                        <img src={logoBoxK} alt="Box K" className="max-h-full max-w-full object-contain grayscale brightness-0" />
                      ) : (
                         // Placeholder visual APENAS se NÃO tiver fundo carregado
                         !fundoCertificado && (
                           <div className="border-2 border-dashed border-gray-400 p-2 text-center text-[10px] text-gray-500 font-bebas rounded">
                             Upload Logo Box K
                           </div>
                         )
                      )}
                    </div>
                  )}

                  {/* Logo Korpus */}
                  <div className="h-16 w-32 flex items-center justify-center">
                    {logoKorpus ? (
                      <img src={logoKorpus} alt="Korpus" className="max-h-full max-w-full object-contain" />
                    ) : (
                       // Placeholder visual APENAS se NÃO tiver fundo carregado
                       !fundoCertificado && (
                         <div className="border-2 border-dashed border-blue-300 p-2 text-center text-[10px] text-blue-500 font-bebas rounded">
                           Upload Logo Korpus
                         </div>
                       )
                    )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
