import type { AppState, Patient, VisitEvent } from '../types'

export const selectPatient = (state: AppState, patientId?: string): Patient | undefined =>
  state.patients.find((patient) => patient.id === patientId)

export const selectVisit = (state: AppState, visitId?: string): VisitEvent | undefined =>
  state.visits.find((visit) => visit.id === visitId)

export const selectCurrentVisit = (state: AppState): VisitEvent | undefined =>
  selectVisit(state, state.meta.lastOpenedVisitId) ?? state.visits.find((visit) => visit.status !== 'completed' && visit.status !== 'archived')

export const selectPatientVisits = (state: AppState, patientId: string): VisitEvent[] =>
  state.visits.filter((visit) => visit.patientId === patientId)
