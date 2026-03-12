
export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  upvotes: string;
  comments: number;
  preview: string;
  url: string;
}

export interface RedditInsights {
  posts: RedditPost[];
  summary: {
    themes: string[];
    sentiment: 'Positive' | 'Neutral' | 'Mixed' | 'Negative';
  };
}

export async function getRedditInsights(productName: string): Promise<RedditInsights> {
  // Mocking Reddit data fetch
  // In production, this would use Reddit API or a search aggregator
  
  const posts: RedditPost[] = [
    {
      id: '1',
      title: `Is ${productName} worth buying in 2025?`,
      subreddit: 'r/technology',
      upvotes: '1.2k',
      comments: 350,
      preview: "Users discuss battery life, performance, and long-term durability. Most agree it's a solid choice for the price.",
      url: 'https://reddit.com'
    },
    {
      id: '2',
      title: `${productName} long term review - 6 months later`,
      subreddit: 'r/gadgets',
      upvotes: '850',
      comments: 120,
      preview: "Actually surprised by how well it held up. No major issues found except for some minor software glitches.",
      url: 'https://reddit.com'
    },
    {
      id: '3',
      title: `${productName} vs competitors - which one to pick?`,
      subreddit: 'r/BuyingAdvice',
      upvotes: '420',
      comments: 85,
      preview: "Comparing features side by side. Some users report heating during heavy workloads but overall positive.",
      url: 'https://reddit.com'
    }
  ];

  return {
    posts,
    summary: {
      themes: [
        "Excellent build quality and reliability",
        "Strong performance for daily tasks",
        "Occasional heating observed under stress"
      ],
      sentiment: 'Positive'
    }
  };
}
