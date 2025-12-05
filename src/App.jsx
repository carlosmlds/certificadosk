import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Calendar, Image as ImageIcon, FileText, Loader, AlertCircle } from 'lucide-react';

// --- CONFIGURAÇÃO DE IMAGENS PADRÃO E AUTOMÁTICAS ---
// ?v=2 para forçar atualização de cache
const FUNDO_MAP = {
  '1 MÊS': {
    ouro: '/img_fundos/fundo_1mes.jpg?v=2',
    box_k: '/img_fundos/fundo_1mes_boxk.jpg?v=2'
  },
  '3 MESES': {
    ouro: '/img_fundos/fundo_3meses.jpg?v=2',
    box_k: '/img_fundos/fundo_3meses_boxk.jpg?v=2'
  },
  '6 MESES': {
    ouro: '/img_fundos/fundo_6meses.jpg?v=2',
    box_k: '/img_fundos/fundo_6meses_boxk.jpg?v=2'
  },
  '1 ANO': {
    ouro: '/img_fundos/fundo_1ano.jpg?v=2',
    box_k: '/img_fundos/fundo_1ano_boxk.jpg?v=2'
  },
};

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
  const [periodo, setPeriodo] = useState('1 MÊS');
  const [nomeEvento, setNomeEvento] = useState('');
  const [artigoEvento, setArtigoEvento] = useState('ao');
  const [plano, setPlano] = useState('ouro'); 
  const [dataRetirada, setDataRetirada] = useState(new Date().toISOString().split('T')[0]);
  const [fundoCertificado, setFundoCertificado] = useState(FUNDO_MAP['1 MÊS'].ouro || null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Estado para controlar o zoom/escala responsiva
  const [scale, setScale] = useState(1);
  
  const certificateRef = useRef(null);
  const previewContainerRef = useRef(null); // Referência para o container pai do certificado

  // Carrega bibliotecas externas
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

  // Efeito de Responsividade: Calcula a escala ideal
  useEffect(() => {
    const handleResize = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth;
        // 1123px é a largura base do certificado. 
        // Subtraímos padding (32px) para dar uma margem de segurança.
        const newScale = Math.min(1, (containerWidth - 32) / 1123);
        setScale(newScale);
      }
    };

    // Executa ao montar e ao redimensionar a tela
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Troca automática de fundos
  useEffect(() => {
    const opcoesPeriodo = FUNDO_MAP[periodo];
    if (opcoesPeriodo) {
      const novoFundo = opcoesPeriodo[plano];
      if (novoFundo) {
        setFundoCertificado(novoFundo);
      }
    }
  }, [periodo, plano]);

  // Gramática automática
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

  const formatarNomeEvento = (texto) => {
    if (!texto) return '';
    if (texto === texto.toUpperCase() && texto.trim().length > 0) return texto;
    const excecoes = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'para', 'por', 'a', 'o', 'as', 'os', 'ao', 'aos', 'à', 'às'];
    return texto.toLowerCase().split(' ').map((palavra, index) => {
      if (index > 0 && excecoes.includes(palavra)) return palavra;
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

  // --- NOVA FUNÇÃO DE PREPARAÇÃO DO CANVAS (ALTA QUALIDADE) ---
  const prepareCanvas = async () => {
    if (!window.html2canvas) throw new Error("Biblioteca html2canvas não carregada.");
    
    // Captura o elemento original
    const canvas = await window.html2canvas(certificateRef.current, {
      scale: 3, // Aumenta a escala para 3x (Alta Resolução)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      // Força o tamanho original do certificado, ignorando o zoom da tela
      width: 1123,
      height: 794,
      windowWidth: 1123,
      windowHeight: 794,
      // Truque: Clona o documento e remove o "zoom" (transform) antes de tirar a foto
      onclone: (clonedDoc) => {
        const element = clonedDoc.querySelector('.print-area');
        if (element) {
          element.style.transform = 'none'; // Remove o zoom responsivo
          element.style.margin = '0'; // Garante que não tenha margens deslocando
        }
      }
    });
    return canvas;
  };

  const downloadJPG = async () => {
    setIsGenerating(true);
    try {
      const canvas = await prepareCanvas();
      const image = canvas.toDataURL("image/jpeg", 0.95); // 95% de qualidade JPG
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
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
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

  const dataFinal = formatDate(addMonths(dataRetirada, 1).toISOString().split('T')[0]);
  const dataRetiradaFormatada = formatDate(dataRetirada);

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

      {/* --- MENU LATERAL (Esquerda / Topo no Mobile) --- */}
      <div className="no-print w-full md:w-1/3 lg:w-1/4 bg-white p-6 shadow-lg z-10 border-b md:border-b-0 md:border-r border-gray-200 h-auto md:h-screen md:sticky md:top-0 flex flex-col order-2 md:order-1">
        
        {/* TÍTULO */}
        <div className="mb-6 pt-2 text-center md:text-left">
          <h1 className="text-2xl font-bold text-blue-900 font-bebas tracking-wide">
            Gerador de Certificados K
          </h1>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Período</label>
              <select 
                value={periodo} 
                onChange={(e) => setPeriodo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="1 MÊS">1 MÊS</option>
                <option value="3 MESES">3 MESES</option>
                <option value="6 MESES">6 MESES</option>
                <option value="1 ANO">1 ANO</option>
                <option value="OUTRO">OUTRO (Upload Manual)</option>
              </select>
              {periodo !== 'OUTRO' && (
                <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> O fundo muda com o Período e Plano.
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
                *Maiúsculas automáticas (exceto siglas).
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
                <label className="block text-xs text-gray-500 mb-1">Plano (Troca Fundo)</label>
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

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Upload size={14}/> Fundo Manual
              </h3>
            </div>
            <p className="text-[10px] text-gray-500 mb-2">
              O fundo é automático. Use isto apenas se precisar substituir a imagem padrão.
            </p>
            <input type="file" className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept="image/*" onChange={(e) => handleImageUpload(e, setFundoCertificado)} />
          </div>

          <div className="pt-4 space-y-2 border-t mt-4">
            <h3 className="text-sm font-bold text-gray-700">Exportar</h3>
            <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={downloadPDF}
                  disabled={isGenerating || !fundoCertificado}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 md:py-2 px-3 rounded shadow flex items-center justify-center gap-1 transition text-sm disabled:opacity-50"
                >
                  {isGenerating ? <Loader size={14} className="animate-spin"/> : <FileText size={16} />} 
                  Baixar PDF
                </button>
                <button 
                  onClick={downloadJPG}
                  disabled={isGenerating || !fundoCertificado}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 md:py-2 px-3 rounded shadow flex items-center justify-center gap-1 transition text-sm disabled:opacity-50"
                >
                  {isGenerating ? <Loader size={14} className="animate-spin"/> : <ImageIcon size={16} />} 
                  Baixar JPG (HD)
                </button>
            </div>
            <button 
              onClick={() => window.print()}
              disabled={!fundoCertificado}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 md:py-2 px-3 rounded shadow flex items-center justify-center gap-2 transition text-xs disabled:opacity-50 hidden md:flex"
            >
              <Download size={14} /> Imprimir (Nativo)
            </button>
          </div>
        </div>

        {/* RODAPÉ DO MENU */}
        <div className="pt-4 mt-4 border-t border-gray-200 text-center">
          <p className="text-[10px] text-gray-400 font-mono">
            Versão 2.5 - HD Download
          </p>
        </div>
      </div>

      {/* --- ÁREA DE PRÉ-VISUALIZAÇÃO (Direita / Topo no Mobile) --- */}
      <div 
        ref={previewContainerRef}
        className="flex-1 bg-gray-300 flex items-start md:items-center justify-center p-4 md:p-8 overflow-hidden order-1 md:order-2 min-h-[50vh] md:min-h-screen"
      >
        {/* Wrapper que ajusta a altura dinamicamente conforme o zoom */}
        <div 
          className="relative transition-all duration-300 ease-out shadow-2xl"
          style={{ 
            width: `${1123 * scale}px`, 
            height: `${794 * scale}px` 
          }}
        >
          <div 
            ref={certificateRef}
            className="print-area relative bg-white overflow-hidden text-black origin-top-left"
            style={{ 
              width: '1123px', 
              height: '794px',
              transform: `scale(${scale})`
            }} 
          >
            {fundoCertificado ? (
              <img 
                src={fundoCertificado} 
                alt="Fundo do Certificado" 
                className="absolute inset-0 w-full h-full object-cover z-0"
                onError={(e) => {
                  e.target.onerror = null; 
                  e.target.src = "https://via.placeholder.com/1123x794?text=Imagem+N%C3%A3o+Encontrada+no+Servidor+(Verifique+public/img_fundos)";
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

            <div className="absolute top-0 right-0 w-[65%] h-full flex flex-col pt-16 pr-20 pb-10 text-right z-20">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
