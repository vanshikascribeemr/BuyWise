
export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  viewCount: string;
}

export async function getYouTubeReviews(query: string): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const searchQuery = `${query} product review`;

  if (!apiKey || apiKey === 'your_youtube_key') {
    // Fallback Mock Data
    return [
      { id: '1', title: `${query} In-Depth Review`, thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg', channelName: 'TechGuru', viewCount: '1.2M' },
      { id: '2', title: `Why I switched to ${query}`, thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/1.jpg', channelName: 'LifeHacker', viewCount: '500K' },
      { id: '3', title: `${query}: 6 Months Later`, thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/2.jpg', channelName: 'DailyTech', viewCount: '250K' },
      { id: '4', title: `${query} vs Competitors`, thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/3.jpg', channelName: 'SpecGeek', viewCount: '100K' },
    ];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=4&q=${encodeURIComponent(searchQuery)}&type=video&key=${apiKey}`
    );
    const data = await response.json();
    
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelName: item.snippet.channelTitle,
      viewCount: 'Verified'
    }));
  } catch (error) {
    console.error('YouTube API Error:', error);
    return [];
  }
}
