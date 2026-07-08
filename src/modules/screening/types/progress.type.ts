export type ResumeParsingBodyType = {
    id: string;
    url: string;
    filename: string;
    status: string;
}

export type ResumeScoringBodyType = {
    id: string;
    url: string;
    filename: string;
    status: string;
}

export type EventBodyType = {
    type: 'Parsing' | 'Scoring' | 'Screening' | 'Parsing_Batch_Complete' | 'Scoring_Batch_Complete';
    resume_id: string;
    data?: any;
    status: string;
    message: string;
}

export type STAGE_CONFIG_TYPE = Record<string, { label: string; color: string; icon: "spin" | "check" | "error" | "wait" }>
