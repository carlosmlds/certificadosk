import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, Calendar, Image as ImageIcon, FileText, Loader, AlertCircle, X, Plus, MoveHorizontal, Maximize } from 'lucide-react';

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

const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

// Função para colocar a primeira letra de cada nome em maiúsculo
const capitalizeFirstLetter = (texto) => {
  if (!texto) return '';
  return texto.toLowerCase().split(' ').map(palavra => {
    return palavra.charAt(0).toUpperCase() + palavra.slice(1);
  }).join(' ');
};

export default function App() {
  const [periodo, setPeriodo] = useState('1 MÊS');
  const [nomeEvento, setNomeEvento] = useState('');
  const [artigoEvento, setArtigoEvento] = useState('ao');
  const [plano, setPlano] = useState('ouro');
  const [dataRetirada, setDataRetirada] = useState(new Date().toISOString().split('T')[0]);
  const [fundoCertificado, setFundoCertificado] = useState(FUNDO_MAP['1 MÊS'].ouro || null);

  const [nomeAluno, setNomeAluno] = useState('');
  const [tipoOcasiao, setTipoOcasiao] = useState('premiacao');
  const [textoOutro, setTextoOutro] = useState('');

  const [extraLogo, setExtraLogo] = useState(null);
  const [extraLogoSize, setExtraLogoSize] = useState(64);
  const [extraLogoX, setExtraLogoX] = useState(300);

  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);

  const certificateRef = useRef(null);
  const previewContainerRef = useRef(null);

  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
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
    ]).catch(err => console.error('Erro ao carregar bibliotecas', err));
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth;
        const newScale = Math.min(1, (containerWidth - 32) / 1123);
        setScale(newScale);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const opcoesPeriodo = FUNDO_MAP[periodo];
    if (opcoesPeriodo) {
      const novoFundo = opcoesPeriodo[plano];
      if (novoFundo) setFundoCertificado(novoFundo);
    }
  }, [periodo, plano]);

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
    const map = { '1 MÊS': 'um mês', '3 MESES': 'três meses', '6 MESES': 'seis meses', '1 ANO': 'um ano', 'OUTRO': 'período' };
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

  const getTextoOcasiao = () => {
    if (tipoOcasiao === 'outro') return textoOutro || '................................';
    const palavra = tipoOcasiao === 'premiacao' ? 'premiação' : 'bonificação';
    return `como ${palavra} ${artigoEvento}`;
  };

  const prepareCanvas = async () => {
    if (!window.html2canvas) throw new Error("Biblioteca html2canvas não carregada.");
    const canvas = await window.html2canvas(certificateRef.current, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 1123,
      height: 794,
      windowWidth: 1123,
      windowHeight: 794,
      onclone: (clonedDoc) => {
        const element = clonedDoc.querySelector('.print-area');
        if (element) {
          element.style.transform = 'none';
          element.style.margin = '0';
        }
      }
    });
    return canvas;
  };

  const downloadJPG = async () => {
    setIsGenerating(true);
    try {
      const canvas = await prepareCanvas();
      const image = canvas.toDataURL("image/jpeg", 0.95);
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

      {/* MENU LATERAL */}
      <div className="no-print w-full md:w-1/3 lg:w-1/4 bg-white p-6 shadow-lg z-10 border-b md:border-b-0 md:border-r border-gray-200 h-auto md:h-screen md:sticky md:top-0 flex flex-col order-2 md:order-1 overflow-y-auto">

        <div className="mb-6 pt-2 text-center md:text-left">
          <h1 className="text-2xl font-bold text-blue-900 font-bebas tracking-wide">
            Gerador de Certificados K
          </h1>
        </div>

        <div className="space-y-4">

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Período</label>
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm">
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
            <input type="text" value={nomeEvento} onChange={(e) => setNomeEvento(e.target.value)} placeholder="Ex: Desafio Novembro Azul" className="w-full p-2 border border-gray-300 rounded text-sm" />
            <p className="text-[10px] text-gray-400 mt-1">*Maiúsculas automáticas (exceto siglas).</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nome do Aluno <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input 
              type="text" 
              value={nomeAluno} 
              onChange={(e) => setNomeAluno(e.target.value)} 
              placeholder="Ex: João Silva" 
              className="w-full p-2 border border-gray-300 rounded text-sm" 
            />
            <p className="text-[10px] text-gray-400 mt-1">*Aparece no certificado se preenchido.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Ocasião</label>
            <div className="flex gap-2">
              <select value={tipoOcasiao} onChange={(e) => setTipoOcasiao(e.target.value)} className="flex-1 p-2 border border-gray-300 rounded text-sm">
                <option value="premiacao">Premiação</option>
                <option value="bonificacao">Bonificação</option>
                <option value="outro">Outro (texto livre)</option>
              </select>
              {tipoOcasiao !== 'outro' && (
                <select value={artigoEvento} onChange={(e) => setArtigoEvento(e.target.value)} className="w-16 p-2 bg-gray-50 border border-gray-300 rounded text-sm">
                  <option value="ao">ao</option>
                  <option value="à">à</option>
                </select>
              )}
            </div>
            {tipoOcasiao === 'outro' && (
              <input type="text" value={textoOutro} onChange={(e) => setTextoOutro(e.target.value)} placeholder='Ex: como presente especial ao' className="w-full mt-2 p-2 border border-gray-300 rounded text-sm" />
            )}
            <p className="text-[10px] text-gray-400 mt-1">
              {tipoOcasiao === 'outro' ? '*Frase completa que substitui "como premiação ao".' : '*Preposição usada antes do nome do evento.'}
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Plano (Troca Fundo)</label>
            <div className="flex border rounded overflow-hidden">
              <button onClick={() => setPlano('ouro')} className={`flex-1 py-2 text-xs font-medium ${plano === 'ouro' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Ouro</button>
              <button onClick={() => setPlano('box_k')} className={`flex-1 py-2 text-xs font-medium ${plano === 'box_k' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Box K</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <Calendar size={14} /> Data de Retirada
            </label>
            <input type="date" value={dataRetirada} onChange={(e) => setDataRetirada(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm" />
          </div>

          {/* LOGO EXTRA */}
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Plus size={14} /> Logo Extra</h3>
              {extraLogo && (
                <button onClick={() => setExtraLogo(null)} className="text-red-500 hover:text-red-700 bg-white rounded-full p-1"><X size={12} /></button>
              )}
            </div>
            {!extraLogo ? (
              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-20 border-2 border-indigo-200 border-dashed rounded-lg hover:bg-indigo-100 transition-colors">
                <Upload size={20} className="text-indigo-400 mb-1" />
                <p className="text-[10px] text-indigo-500">Clique para enviar</p>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setExtraLogo)} />
              </label>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center bg-white p-2 rounded border border-gray-200">
                  <img src={extraLogo} alt="Logo Extra" className="h-10 object-contain" />
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-indigo-700 mb-1">
                      <span className="flex items-center gap-1"><Maximize size={10} /> Tamanho</span>
                      <span>{extraLogoSize}px</span>
                    </div>
                    <input type="range" min="20" max="200" value={extraLogoSize} onChange={(e) => setExtraLogoSize(Number(e.target.value))} className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-indigo-700 mb-1">
                      <span className="flex items-center gap-1"><MoveHorizontal size={10} /> Posição (Esq/Dir)</span>
                    </div>
                    <input type="range" min="100" max="600" value={extraLogoX} onChange={(e) => setExtraLogoX(Number(e.target.value))} className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FUNDO MANUAL */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-1"><Upload size={14} /> Fundo Manual</h3>
            <p className="text-[10px] text-gray-500 mb-2">O fundo é automático. Use isto apenas se precisar substituir a imagem padrão.</p>
            <input type="file" className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" accept="image/*" onChange={(e) => handleImageUpload(e, setFundoCertificado)} />
          </div>

          {/* EXPORTAR */}
          <div className="pt-4 space-y-2 border-t">
            <h3 className="text-sm font-bold text-gray-700">Exportar</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={downloadPDF} disabled={isGenerating || !fundoCertificado} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 md:py-2 px-3 rounded shadow flex items-center justify-center gap-1 transition text-sm disabled:opacity-50">
                {isGenerating ? <Loader size={14} className="animate-spin" /> : <FileText size={16} />} Baixar PDF
              </button>
              <button onClick={downloadJPG} disabled={isGenerating || !fundoCertificado} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 md:py-2 px-3 rounded shadow flex items-center justify-center gap-1 transition text-sm disabled:opacity-50">
                {isGenerating ? <Loader size={14} className="animate-spin" /> : <ImageIcon size={16} />} Baixar JPG (HD)
              </button>
            </div>
            <button onClick={() => window.print()} disabled={!fundoCertificado} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 md:py-2 px-3 rounded shadow items-center justify-center gap-2 transition text-xs disabled:opacity-50 hidden md:flex">
              <Download size={14} /> Imprimir (Nativo)
            </button>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-200 text-center">
          <p className="text-[10px] text-gray-400 font-mono">Versão 3.0 - Layout Corrigido</p>
        </div>
      </div>

      {/* ÁREA DE PRÉ-VISUALIZAÇÃO */}
      <div
        ref={previewContainerRef}
        className="flex-1 bg-gray-300 flex items-start md:items-center justify-center p-4 md:p-8 overflow-hidden order-1 md:order-2 min-h-[50vh] md:min-h-screen"
      >
        <div
          className="relative transition-all duration-300 ease-out shadow-2xl"
          style={{ width: `${1123 * scale}px`, height: `${794 * scale}px` }}
        >
          <div
            ref={certificateRef}
            className="print-area relative bg-white overflow-hidden text-black origin-top-left"
            style={{ width: '1123px', height: '794px', transform: `scale(${scale})` }}
          >
            {/* FUNDO */}
            {fundoCertificado ? (
              <img
                src={fundoCertificado}
                alt="Fundo do Certificado"
                className="absolute inset-0 w-full h-full object-cover z-0"
                onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/1123x794?text=Imagem+N%C3%A3o+Encontrada"; }}
              />
            ) : (
              <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-10 border-4 border-dashed border-gray-300 m-4 rounded-xl">
                <ImageIcon size={48} className="mb-4 opacity-50" />
                <p className="text-xl font-semibold">Aguardando Fundo...</p>
              </div>
            )}

            {/* CONTEÚDO — coluna direita, posicionada absolutamente para não depender do fundo */}
            <div
              className="absolute z-20 flex flex-col text-right"
              style={{
                top: '20px',
                right: '80px',
                width: '620px',
                bottom: '360px',   // Subimos ainda mais para garantir o respiro
              }}
            >
              {/* Espaço reservado para o elemento "Certificado" do fundo (caligrafia) */}
              <div style={{ height: '185px', flexShrink: 0 }} />

              {/* PARABÉNS */}
              <h2 className="font-garamond uppercase tracking-normal text-gray-900" style={{ fontSize: '38pt', lineHeight: 1, marginBottom: '6px' }}>
                PARABÉNS!
              </h2>

              {/* Subtítulo */}
              <p className="font-garamond text-black" style={{ fontSize: '20pt', marginBottom: '8px' }}>
                Você agora faz parte da família Korpus!
              </p>

              {/* Nome do aluno — Capitalização automática na exibição */}
              {nomeAluno && (
                <p className="font-garamond font-bold italic text-gray-900" style={{ fontSize: '18pt', marginBottom: '8px' }}>
                  {nomeAluno.toLowerCase().split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')}
                </p>
              )}

              {/* Texto principal — LineHeight reduzido para 1.2 */}
              <div className="font-garamond text-gray-800" style={{ fontSize: '16pt', lineHeight: 1.2 }}>
                Este certificado contempla {getPeriodoExtenso(periodo)} de Academia Korpus no{' '}
                <span className="font-bold">{plano === 'ouro' ? 'Plano Ouro' : 'Plano Ouro Box K'}</span>{' '}
                {getTextoOcasiao()}
                {tipoOcasiao !== 'outro' && (
                  <><br /><span className="font-bold" style={{ fontSize: '18pt' }}>{formatarNomeEvento(nomeEvento) || '................................'}</span></>
                )}
                {tipoOcasiao === 'outro' && (
                  <>{' '}<br /><span className="font-bold" style={{ fontSize: '18pt' }}>{formatarNomeEvento(nomeEvento) || '................................'}</span></>
                )}
              </div>

              {/* Espaço flexível — Empurra a data para o limite do 'bottom' acima */}
              <div style={{ flex: 1 }} />

              {/* Data — Agora bem longe das assinaturas */}
              <div className="font-garamond text-gray-600" style={{ fontSize: '9.5pt', lineHeight: 1.2 }}>
                *Bolsa intransferível. O resgate pode ser feito do dia{' '}
                <span className="font-bold">{dataRetiradaFormatada}</span> até{' '}
                <span className="font-bold">{dataFinal}</span> na recepção da unidade de sua escolha.
              </div>
            </div>

            {/* LOGO EXTRA */}
            {extraLogo && (
              <div className="absolute z-30 flex items-center justify-center" style={{ bottom: '40px', right: `${extraLogoX}px` }}>
                <img src={extraLogo} alt="Logo Parceiro" className="object-contain drop-shadow-md" style={{ height: `${extraLogoSize}px` }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
