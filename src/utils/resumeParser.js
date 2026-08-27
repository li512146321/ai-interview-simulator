import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

export async function extractTextFromFile(file) {
  const fileName = file.name.toLowerCase()
  
  if (fileName.endsWith('.txt')) {
    return await parseTxt(file)
  } else if (fileName.endsWith('.pdf')) {
    return await parsePdf(file)
  } else if (fileName.endsWith('.docx')) {
    return await parseDocx(file)
  } else {
    throw new Error('不支持的文件格式，请上传 .pdf .docx .txt 文件')
  }
}

async function parseTxt(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    fullText += pageText + '\n'
  }
  
  return fullText.trim() || '无法提取PDF文字，请确认文件是否为文本型PDF'
}

async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}