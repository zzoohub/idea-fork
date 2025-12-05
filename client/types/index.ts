export interface IdeaCategory {
  name: string;
  color: "primary" | "teal" | "orange" | "indigo";
}

export interface Idea {
  id: number;
  title: string;
  image: string;
  categories: IdeaCategory[];
  problem: string;
  solution: string;
  targetUsers: string;
}
