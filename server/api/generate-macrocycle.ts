import { promptMarcocycleSchema } from '../schemas/prompt-workout'
import { getAIClient } from '../utils/getAIClient'

const prompt = `
  The goal of the plan is to:
  To improve my functional strength, address muscle imblances, improve posture and improve in all areas like hypertrophy, aerobic, anaerobic, flexibility, mobility etc, I want to be good at all aspects.
  The main goal overall though is endurance for rounds/pads and the functional posture

  Areas with imbalances/weak/details to consider:
  My scapular is weak overall but my right shoulder dislocated years ago weakining my rotator cuff so my right side is even weaker.
  My neck is really tight which seems to create pessure in my ear and tinitus.
  My torso and hips point my rightwardly.
  My hip flexors are weak and my glutes.
  My left calf is weaker and my tibialis is tight and weak on both side but more so on the left
  My right side of my abs are weaker
  My QLs are tight, my left ql pulled a few weeks ago and struggles when training thai
  My feet are tight and some times pull on the fascia
  My running technic is like a body builders, I hunch and dead my weight, I am working on upright and more peddeling
  I am a software engineer working a office job.

  Current fitness level:
  My fast run is around a 5:50 for a 5k and when doing pads in Thai I fatigue relatively fast.  

  Days already training or rehabbing extra
  Monday a bike ride to and from work 10miles each way
  Wednesday a bike ride to and from work 10miles each way
  Tuesday nothing
  Thursday Sports massage
  Friday 1 hour Mauy Thai
  Saturday nothing
  Sunday nothing

  Evaluate all prior information and generate the goal, objectives, a suitable name, the objectives will be used to generate mesocycles.
  When evaluating, consider how the injuries may be related and the importance based on the goal of fixing them so the main issues can be addressed first.
  The importance is rated on a scale of 1-10, 1 being the highest priority and 10 the lowest. If something is a 1, workouts will mainly be entirely focused on this unless rest is required, there can only be one 1.
  A 1 would a major injury which needs rehabbing to faciliate training.
`

export default defineEventHandler(async () => {
  const ai = getAIClient()
  const response = (await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: promptMarcocycleSchema.toJSONSchema(),
    },
  }))

  if (response === undefined)
    return 'No data returned'

  await useStorage().setItem('local:my-workouts.json', JSON.stringify(response))
  useStorage()

  return response
})
