export const gradients = [
  'bg-gradient-to-br from-slate-900 to-slate-800',
  'bg-gradient-to-br from-zinc-900 to-neutral-900',
  'bg-gradient-to-br from-stone-900 to-stone-800',
  'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-950',
  'bg-gradient-to-br from-blue-950 to-slate-900',
  'bg-gradient-to-br from-emerald-950 to-teal-950',
  'bg-gradient-to-br from-rose-950 to-red-950',
  'bg-gradient-to-br from-indigo-950 to-slate-900',
  'bg-gradient-to-br from-cyan-950 to-blue-950',
  'bg-gradient-to-br from-fuchsia-950 to-purple-950',
];

export const images = [
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1080&q=80', // nature mist
  'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1080&q=80', // mountain night
  'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1080&q=80', // rain window
  'https://images.unsplash.com/photo-1488866022504-f2584929ca5f?auto=format&fit=crop&w=1080&q=80', // dark forest
  'https://images.unsplash.com/photo-1436891620584-47fd0e565afb?auto=format&fit=crop&w=1080&q=80', // dark ocean
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1080&q=80', // abstract dark
  'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=1080&q=80', // rain street
  'https://images.unsplash.com/photo-1444080748397-f442aa95c3e5?auto=format&fit=crop&w=1080&q=80', // dark sunset
  'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?auto=format&fit=crop&w=1080&q=80', // wheat field sunset
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1080&q=80', // dark textured wall
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1080&q=80', // starry night
  'https://images.unsplash.com/photo-1505322022379-7c3353ee6291?auto=format&fit=crop&w=1080&q=80', // dark leaves
];

export const presetColors = [
  'bg-slate-800',
  'bg-zinc-800',
  'bg-stone-800',
  'bg-red-900',
  'bg-orange-900',
  'bg-amber-900',
  'bg-green-900',
  'bg-emerald-900',
  'bg-teal-900',
  'bg-cyan-900',
  'bg-sky-900',
  'bg-blue-900',
  'bg-indigo-900',
  'bg-violet-900',
  'bg-purple-900',
  'bg-fuchsia-900',
  'bg-pink-900',
  'bg-rose-900',
];

export const presetTextColors = [
  'text-white',
  'text-slate-100',
  'text-zinc-200',
  'text-stone-300',
  'text-red-100',
  'text-orange-100',
  'text-amber-100',
  'text-yellow-100',
  'text-lime-100',
  'text-green-100',
  'text-emerald-100',
  'text-teal-100',
  'text-cyan-100',
  'text-sky-100',
  'text-blue-100',
  'text-indigo-100',
  'text-violet-100',
  'text-purple-100',
  'text-fuchsia-100',
  'text-pink-100',
  'text-rose-100',
  'text-slate-900',
  'text-black',
];

export const moodColors: Record<string, string[]> = {
  'Trầm lắng': ['bg-slate-900', 'bg-zinc-900', 'bg-stone-900', 'bg-gradient-to-br from-slate-900 to-slate-800'],
  'Tích cực': ['bg-sky-900', 'bg-teal-900', 'bg-emerald-900', 'bg-gradient-to-br from-emerald-900 to-teal-900'],
  'Buồn': ['bg-gray-900', 'bg-blue-950', 'bg-indigo-950', 'bg-gradient-to-br from-gray-900 to-slate-900'],
  'Bình yên': ['bg-cyan-950', 'bg-sky-950', 'bg-teal-950', 'bg-gradient-to-br from-cyan-950 to-blue-950'],
  'Sâu sắc': ['bg-purple-950', 'bg-fuchsia-950', 'bg-violet-950', 'bg-gradient-to-br from-purple-950 to-indigo-950'],
  'Động lực': ['bg-orange-950', 'bg-red-950', 'bg-rose-950', 'bg-gradient-to-br from-rose-950 to-red-950'],
  'Ngẫm sự đời': ['bg-neutral-900', 'bg-stone-950', 'bg-zinc-950', 'bg-gradient-to-br from-stone-900 to-neutral-900'],
};

export const getRandomBackground = (type?: 'image' | 'gradient' | 'color', color?: string, imageUrl?: string) => {
  if (type === 'color' && color) {
    return { type: 'color', value: color };
  }

  const isImage = type === 'image' || (type === undefined && Math.random() > 0.5);
  
  if (isImage) {
    if (imageUrl) {
      return { type: 'image', value: imageUrl };
    }
    const randomImage = images[Math.floor(Math.random() * images.length)];
    return { type: 'image', value: randomImage };
  } else {
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
    return { type: 'gradient', value: randomGradient };
  }
};
