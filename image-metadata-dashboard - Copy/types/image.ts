// types/image.ts

export type ImageItem = {
  key: string
  s3Key?: string
  imageUrl?: string

  farmer: string
  crop: string
  weatherLocation?: string
  createdAt: string
  plantingDate?: string   
  pestDetected: boolean
  diseaseDetected: boolean
  isGoldStandard: boolean
  diseaseStage?: string
  pestName?: string
  pestStage?: string
  diseaseName?: string
  cropStage?: string
  remarks?: string
}