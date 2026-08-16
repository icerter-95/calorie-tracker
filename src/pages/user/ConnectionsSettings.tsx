import AppleHealthSetup from '../../components/AppleHealthSetup'

export default function ConnectionsSettings() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Sync weight and steps from Apple Health via an iPhone automation (not live during the day).
      </p>
      <ul className="space-y-2">
        <AppleHealthSetup />
      </ul>
    </div>
  )
}
