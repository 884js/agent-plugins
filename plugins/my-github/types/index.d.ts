export type Review =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REVIEW_REQUIRED"
  | null;

export type Checks =
  | "SUCCESS"
  | "FAILURE"
  | "ERROR"
  | "PENDING"
  | "EXPECTED"
  | null;

export type PullItem = {
  repo: string;
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  review: Review;
  checks: Checks;
  updatedAt: string;
};

export type IssueItem = {
  repo: string;
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  assignees: string[];
};

export type Snapshot = {
  prs: PullItem[];
  issues: IssueItem[];
  prTotal: number;
  issueTotal: number;
  fetchedAt: string | null;
  error: string | null;
  isLoading: boolean;
};

declare module "claude-code" {
  interface PluginState {
    "my-github": {
      snapshot: Shaped<Snapshot>;
      /** 絞り込む持ち主。'all' はすべて、'' はまだ選んでいない */
      owner: string;
      /** 1 件を 1 行に詰めて出すか */
      isCompact: boolean;
      /** パネルを開け閉めするたびに増える。入力欄の上の帯を描き直させるためだけに使う */
      paneTick: number;
    };
  }
}
