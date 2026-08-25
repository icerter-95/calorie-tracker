/**
 * Diary add-meal orchestrator: floating Camera / Input buttons, native
 * camera vs library file inputs, voice, and favorites. Edit stays on MealForm.
 *
 * Floating Camera must open the device camera immediately (capture input via
 * label). Do not mount CameraMode on that tap — that unmounts the label and
 * leaves the user on the in-app “Open camera” screen instead.
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { addFavorite, addMeal } from '../db'
import {
  ADD_MEAL_CAMERA_INPUT_ID,
  ADD_MEAL_LIBRARY_INPUT_ID,
  hiddenFileInputClass,
  LIBRARY_IMAGE_ACCEPT,
} from '../lib/addMealInputs'
import { compressImage } from '../lib/compressImage'
import { defaultMealTypeForNow } from '../lib/mealTypeDefaults'
import { copyMealPhoto } from '../lib/mealPhotos'
import {
  isSpeechRecognitionAvailable,
  startSpeechRecognition,
} from '../lib/speech'
import type { MealInput, MealType } from '../types'
import AddMealButtons from './AddMealButtons'
import CameraMode from './CameraMode'
import FavoritesPanel from './FavoritesPanel'
import InputSheet from './InputSheet'
import VoicePanel from './VoicePanel'

export type AddMealFlowHandle = {
  openCamera: (slot?: MealType) => void
}

type Flow = 'idle' | 'camera' | 'input' | 'voice' | 'favorites'

interface AddMealFlowProps {
  date: string
  onSaved: () => void
}

const AddMealFlow = forwardRef<AddMealFlowHandle, AddMealFlowProps>(
  function AddMealFlow({ date, onSaved }, ref) {
    const cameraInputRef = useRef<HTMLInputElement>(null)
    const libraryInputRef = useRef<HTMLInputElement>(null)
    const speechStopRef = useRef<{ stop: () => void } | null>(null)

    useEffect(() => {
      libraryInputRef.current?.removeAttribute('capture')
    }, [])

    const [flow, setFlow] = useState<Flow>('idle')
    const [mealType, setMealType] = useState<MealType>(defaultMealTypeForNow)
    const [photo, setPhoto] = useState<Blob | null>(null)
    const [pickingPhoto, setPickingPhoto] = useState(false)
    const [photoError, setPhotoError] = useState<string | null>(null)
    const [transcript, setTranscript] = useState('')
    const [listening, setListening] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [favoritesReviewing, setFavoritesReviewing] = useState(false)

    function resetPhoto() {
      setPhoto(null)
      setPickingPhoto(false)
      setPhotoError(null)
    }

    function closeAll() {
      speechStopRef.current?.stop()
      speechStopRef.current = null
      setListening(false)
      setFlow('idle')
      setMealType(defaultMealTypeForNow())
      resetPhoto()
      setTranscript('')
      setSaveError(null)
      setFavoritesReviewing(false)
    }

    /** Reset meal/photo state without opening CameraMode (keeps the floating
     * camera <label> mounted so htmlFor can open the native capture UI). */
    function armCamera(slot?: MealType) {
      setMealType(slot ?? defaultMealTypeForNow())
      resetPhoto()
      setSaveError(null)
    }

    /** Empty meal-slot path: show CameraMode as fallback, then try capture. */
    function openCamera(slot?: MealType) {
      armCamera(slot)
      setFlow('camera')
      cameraInputRef.current?.click()
    }

    useImperativeHandle(ref, () => ({ openCamera }))

    function openInput() {
      setMealType(defaultMealTypeForNow())
      setSaveError(null)
      setFlow('input')
    }

    function toggleFavorites() {
      if (flow === 'favorites') {
        closeAll()
        return
      }
      setMealType(defaultMealTypeForNow())
      setSaveError(null)
      setFlow('favorites')
    }

    async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) {
        // User dismissed the native picker — stay wherever we already are
        // (idle after floating Camera, or CameraMode after Retake).
        return
      }

      setPhotoError(null)
      setPickingPhoto(true)
      setFlow('camera')
      try {
        const compressed = await compressImage(file)
        setPhoto(compressed)
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : 'Could not process photo')
      } finally {
        setPickingPhoto(false)
      }
    }

    function startListening() {
      speechStopRef.current?.stop()
      const session = startSpeechRecognition({
        onResult: setTranscript,
        onEnd: () => {
          setListening(false)
          speechStopRef.current = null
        },
        onError: (message) => {
          setSaveError(message)
          setListening(false)
          speechStopRef.current = null
        },
      })
      if (session) {
        setListening(true)
        speechStopRef.current = session
      }
    }

    function openVoice() {
      setSaveError(null)
      setTranscript('')
      setFlow('voice')
      startListening()
    }

    async function handleSave(data: MealInput, options?: { asFavorite?: boolean }) {
      setSaveError(null)
      await addMeal(data)
      if (options?.asFavorite) {
        let photoUrl: string | undefined
        if (data.photoUrl) {
          photoUrl = await copyMealPhoto(data.photoUrl)
        }
        await addFavorite({
          name: data.description?.trim() || 'Meal',
          photoUrl,
          ingredients: data.ingredients,
          totalCalories: data.totalCalories,
          proteinG: data.proteinG,
          carbsG: data.carbsG,
          fatG: data.fatG,
          note: data.note,
        })
      }
      closeAll()
      onSaved()
    }

    return createPortal(
      <>
        {(flow === 'idle' || (flow === 'favorites' && !favoritesReviewing)) && (
          <AddMealButtons
            onCamera={() => armCamera()}
            onInput={openInput}
            onFavoritesToggle={toggleFavorites}
            favoritesOpen={flow === 'favorites'}
          />
        )}

        <input
          id={ADD_MEAL_CAMERA_INPUT_ID}
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={hiddenFileInputClass}
          onChange={(e) => void handleFileChange(e)}
        />
        <input
          id={ADD_MEAL_LIBRARY_INPUT_ID}
          ref={(el) => {
            libraryInputRef.current = el
            el?.removeAttribute('capture')
          }}
          type="file"
          accept={LIBRARY_IMAGE_ACCEPT}
          className={hiddenFileInputClass}
          onChange={(e) => void handleFileChange(e)}
        />

        {flow === 'camera' && (
          <CameraMode
            date={date}
            mealType={mealType}
            onMealTypeChange={setMealType}
            photo={photo}
            pickingPhoto={pickingPhoto}
            processError={photoError}
            onCancel={closeAll}
            onSave={handleSave}
          />
        )}

        {flow === 'input' && (
          <InputSheet
            onVoice={openVoice}
            onCancel={closeAll}
          />
        )}

        {flow === 'voice' && (
          <VoicePanel
            date={date}
            mealType={mealType}
            onMealTypeChange={setMealType}
            transcript={transcript}
            onTranscriptChange={setTranscript}
            listening={listening}
            speechAvailable={isSpeechRecognitionAvailable()}
            onStartListening={startListening}
            speechError={saveError}
            onCancel={closeAll}
            onSave={handleSave}
          />
        )}

        {flow === 'favorites' && (
          <FavoritesPanel
            date={date}
            mealType={mealType}
            onMealTypeChange={setMealType}
            onCancel={closeAll}
            onSave={handleSave}
            onReviewingChange={setFavoritesReviewing}
          />
        )}
      </>,
      document.body,
    )
  },
)

export default AddMealFlow
