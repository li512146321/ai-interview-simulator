export const positions = [
  { id: 'java', name: 'Java开发工程师', icon: '☕', type: 'tech', questions: 15, hot: true, desc: 'Java后端开发面试' },
  { id: 'frontend', name: '前端开发工程师', icon: '💻', type: 'tech', questions: 15, hot: false, desc: '前端开发面试' },
  { id: 'shengkao', name: '省考公务员', icon: '🏛️', type: 'civil', questions: 12, hot: true, desc: '省考结构化面试' },
  { id: 'guokao', name: '国考公务员', icon: '🇨🇳', type: 'civil', questions: 12, hot: true, desc: '国考结构化面试' },
  { id: 'shiyebian', name: '事业单位', icon: '🏢', type: 'civil', questions: 12, hot: false, desc: '事业单位结构化面试' },
  { id: 'jiaoshi', name: '教师招聘', icon: '📚', type: 'civil', questions: 10, hot: false, desc: '教师结构化面试+试讲' }
]

export function getPosition(id) {
  return positions.find(p => p.id === id) || positions[0]
}

export const techPositions = positions.filter(p => p.type === 'tech')
export const civilPositions = positions.filter(p => p.type === 'civil')