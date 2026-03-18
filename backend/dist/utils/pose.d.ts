export type NormalizedPoint = {
    x: number;
    y: number;
};
export type NormalizedBoxLike = {
    left: number;
    top: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
};
export type BodyPose = {
    leftShoulder: NormalizedPoint;
    rightShoulder: NormalizedPoint;
    leftHip: NormalizedPoint;
    rightHip: NormalizedPoint;
    leftAnkle: NormalizedPoint;
    rightAnkle: NormalizedPoint;
    torsoAngleDeg: number;
};
export declare function inferBodyPoseFromAlphaPng(imageBuffer: Buffer, bodyBox?: NormalizedBoxLike): Promise<BodyPose | undefined>;
