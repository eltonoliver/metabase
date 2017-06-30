import { assoc } from 'icepick';
import _ from "underscore";

import {
    handleActions,
    createAction,
    createThunkAction,
    fetchData
} from 'metabase/lib/redux';

import MetabaseAnalytics from 'metabase/lib/analytics';

import { GettingStartedApi } from "metabase/services";

import { 
    filterUntouchedFields, 
    isEmptyObject 
} from "./utils.js"

const FETCH_GUIDE = "metabase/reference/FETCH_GUIDE";
const SET_ERROR = "metabase/reference/SET_ERROR";
const CLEAR_ERROR = "metabase/reference/CLEAR_ERROR";
const START_LOADING = "metabase/reference/START_LOADING";
const END_LOADING = "metabase/reference/END_LOADING";
const START_EDITING = "metabase/reference/START_EDITING";
const END_EDITING = "metabase/reference/END_EDITING";
const EXPAND_FORMULA = "metabase/reference/EXPAND_FORMULA";
const COLLAPSE_FORMULA = "metabase/reference/COLLAPSE_FORMULA";
const SHOW_DASHBOARD_MODAL = "metabase/reference/SHOW_DASHBOARD_MODAL";
const HIDE_DASHBOARD_MODAL = "metabase/reference/HIDE_DASHBOARD_MODAL";


export const fetchGuide = createThunkAction(FETCH_GUIDE, (reload = false) => {
    return async (dispatch, getState) => {
        const requestStatePath = ["reference", 'guide'];
        const existingStatePath = requestStatePath;
        const getData = async () => {
            return await GettingStartedApi.get();
        };

        return await fetchData({
            dispatch,
            getState,
            requestStatePath,
            existingStatePath,
            getData,
            reload
        });
    };
});

export const setError = createAction(SET_ERROR);

export const clearError = createAction(CLEAR_ERROR);

export const startLoading = createAction(START_LOADING);

export const endLoading = createAction(END_LOADING);

export const startEditing = createAction(START_EDITING, () => {
    MetabaseAnalytics.trackEvent('Data Reference', 'Started Editing');
});

export const endEditing = createAction(END_EDITING, () => {
    MetabaseAnalytics.trackEvent('Data Reference', 'Ended Editing');
});

export const expandFormula = createAction(EXPAND_FORMULA);

export const collapseFormula = createAction(COLLAPSE_FORMULA);

//TODO: consider making an app-wide modal state reducer and related actions
export const showDashboardModal = createAction(SHOW_DASHBOARD_MODAL);

export const hideDashboardModal = createAction(HIDE_DASHBOARD_MODAL);


// Helper functions. This is meant to be a transitional state to get things out of tryFetchData() and friends

const fetchDataWrapper = (props, fn) => {

    return async (argument) => {
        props.clearError();
        props.startLoading();
        try {
            await fn(argument)
        }
        catch(error) {
            console.error(error);
            props.setError(error);
        }

        props.endLoading();
    }
}
export const rFetchGuide = async (props) => {

    fetchDataWrapper(
        props, 
        async () => { 
                await Promise.all(
                    [props.fetchGuide(),
                     props.fetchDashboards(),
                     props.fetchMetrics(),
                     props.fetchSegments(),
                     props.fetchDatabasesWithMetadata()]
                )}
        )()
}
export const rFetchDatabaseMetadata = (props, databaseID) => {
    fetchDataWrapper(props, props.fetchDatabaseMetadata)(databaseID)
}

export const rFetchDatabaseMetadataAndQuestion = async (props, databaseID) => {

    fetchDataWrapper(
        props, 
        async (dbID) => { 
                await Promise.all(
                    [props.fetchDatabaseMetadata(dbID),
                     props.fetchQuestions()]
                )}
        )(databaseID)
}
export const rFetchMetricDetail = async (props, metricID) => {

    fetchDataWrapper(
        props, 
        async (mID) => { 
                await Promise.all(
                    [props.fetchMetricTable(mID),
                     props.fetchMetrics(), 
                     props.fetchGuide()]
                )}
        )(metricID)
}
export const rFetchMetricQuestions = async (props, metricID) => {

    fetchDataWrapper(
        props, 
        async (mID) => { 
                await Promise.all(
                    [props.fetchMetricTable(mID),
                     props.fetchMetrics(), 
                     props.fetchQuestions()]
                )}
        )(metricID)
}
export const rFetchMetricRevisions = async (props, metricID) => {

    fetchDataWrapper(
        props, 
        async (mID) => { 
                await Promise.all(
                    [props.fetchMetricRevisions(mID),
                     props.fetchMetrics()]
                )}
        )(metricID)
}

// export const rFetchDatabaseMetadataAndQuestion = async (props, databaseID) => {
//         clearError();
//         startLoading();
//         try {
//             await Promise.all(
//                     [props.fetchDatabaseMetadata(databaseID),
//                      props.fetchQuestions()]
//                 )
//         }
//         catch(error) {
//             console.error(error);
//             setError(error);
//         }

//         endLoading();
// }

export const rFetchDatabases = (props) => {
    fetchDataWrapper(props, props.fetchDatabases)({})
}
export const rFetchMetrics = (props) => {
    fetchDataWrapper(props, props.fetchMetrics)({})
}

export const rFetchSegments = (props) => {
    fetchDataWrapper(props, props.fetchSegments)({})
}


export const rFetchSegmentDetail = (props, segmentID) => {
    fetchDataWrapper(props, props.fetchSegmentTable)(segmentID)
}

export const rFetchSegmentQuestions = async (props, segmentID) => {

    fetchDataWrapper(
        props, 
        async (sID) => { 
                await Promise.all(
                    [props.fetchSegmentTable(sID),
                     props.fetchQuestions()]
                )}
        )(segmentID)
}
export const rFetchSegmentRevisions = async (props, segmentID) => {

    fetchDataWrapper(
        props, 
        async (sID) => { 
                await Promise.all(
                    [props.fetchSegmentRevisions(sID),
                     props.fetchSegmentTable(sID)]
                )}
        )(segmentID)
}
export const rFetchSegmentFields = async (props, segmentID) => {

    fetchDataWrapper(
        props, 
        async (sID) => { 
                await Promise.all(
                    [props.fetchSegmentFields(sID),
                     props.fetchSegmentTable(sID)]
                )}
        )(segmentID)
}
// Update actions
export const tryUpdateGuide = async (formFields, props) => {
    const {
        guide,
        dashboards,
        metrics,
        segments,
        tables,
        startLoading,
        endLoading,
        endEditing,
        setError,
        resetForm,
        updateDashboard,
        updateMetric,
        updateSegment,
        updateTable,
        updateMetricImportantFields,
        updateSetting,
        fetchGuide,
        clearRequestState
    } = props;

    startLoading();
    try {
        const updateNewEntities = ({
            entities,
            formFields,
            updateEntity
        }) => formFields.map(formField => {
            if (!formField.id) {
                return [];
            }

            const editedEntity = filterUntouchedFields(
                assoc(formField, 'show_in_getting_started', true),
                entities[formField.id]
            );

            if (isEmptyObject(editedEntity)) {
                return [];
            }

            const newEntity = entities[formField.id];
            const updatedNewEntity = {
                ...newEntity,
                ...editedEntity
            };

            const updatingNewEntity = updateEntity(updatedNewEntity);

            return [updatingNewEntity];
        });

        const updateOldEntities = ({
            newEntityIds,
            oldEntityIds,
            entities,
            updateEntity
        }) => oldEntityIds
            .filter(oldEntityId => !newEntityIds.includes(oldEntityId))
            .map(oldEntityId => {
                const oldEntity = entities[oldEntityId];

                const updatedOldEntity = assoc(
                    oldEntity,
                    'show_in_getting_started',
                    false
                );

                const updatingOldEntity = updateEntity(updatedOldEntity);

                return [updatingOldEntity];
            });
        //FIXME: necessary because revision_message is a mandatory field
        // even though we don't actually keep track of changes to caveats/points_of_interest yet
        const updateWithRevisionMessage = updateEntity => entity => updateEntity(assoc(
            entity,
            'revision_message',
            'Updated in Getting Started guide.'
        ));

        const updatingDashboards = updateNewEntities({
                entities: dashboards,
                formFields: [formFields.most_important_dashboard],
                updateEntity: updateDashboard
            })
            .concat(updateOldEntities({
                newEntityIds: formFields.most_important_dashboard ?
                    [formFields.most_important_dashboard.id] : [],
                oldEntityIds: guide.most_important_dashboard ?
                    [guide.most_important_dashboard] :
                    [],
                entities: dashboards,
                updateEntity: updateDashboard
            }));

        const updatingMetrics = updateNewEntities({
                entities: metrics,
                formFields: formFields.important_metrics,
                updateEntity: updateWithRevisionMessage(updateMetric)
            })
            .concat(updateOldEntities({
                newEntityIds: formFields.important_metrics
                    .map(formField => formField.id),
                oldEntityIds: guide.important_metrics,
                entities: metrics,
                updateEntity: updateWithRevisionMessage(updateMetric)
            }));

        const updatingMetricImportantFields = formFields.important_metrics
            .map(metricFormField => {
                if (!metricFormField.id || !metricFormField.important_fields) {
                    return [];
                }
                const importantFieldIds = metricFormField.important_fields
                    .map(field => field.id);
                const existingImportantFieldIds = guide.metric_important_fields[metricFormField.id];

                const areFieldIdsIdentitical = existingImportantFieldIds &&
                    existingImportantFieldIds.length === importantFieldIds.length &&
                    existingImportantFieldIds.every(id => importantFieldIds.includes(id));
                if (areFieldIdsIdentitical) {
                    return [];
                }

                return [updateMetricImportantFields(metricFormField.id, importantFieldIds)];
            });

        const segmentFields = formFields.important_segments_and_tables
            .filter(field => field.type === 'segment');

        const updatingSegments = updateNewEntities({
                entities: segments,
                formFields: segmentFields,
                updateEntity: updateWithRevisionMessage(updateSegment)
            })
            .concat(updateOldEntities({
                newEntityIds: segmentFields
                    .map(formField => formField.id),
                oldEntityIds: guide.important_segments,
                entities: segments,
                updateEntity: updateWithRevisionMessage(updateSegment)
            }));

        const tableFields = formFields.important_segments_and_tables
            .filter(field => field.type === 'table');

        const updatingTables = updateNewEntities({
                entities: tables,
                formFields: tableFields,
                updateEntity: updateTable
            })
            .concat(updateOldEntities({
                newEntityIds: tableFields
                    .map(formField => formField.id),
                oldEntityIds: guide.important_tables,
                entities: tables,
                updateEntity: updateTable
            }));

        const updatingThingsToKnow = guide.things_to_know !== formFields.things_to_know ?
            [updateSetting({key: 'getting-started-things-to-know', value: formFields.things_to_know })] :
            [];

        const updatingContactName = guide.contact && formFields.contact &&
            guide.contact.name !== formFields.contact.name ?
                [updateSetting({key: 'getting-started-contact-name', value: formFields.contact.name })] :
                [];

        const updatingContactEmail = guide.contact && formFields.contact &&
            guide.contact.email !== formFields.contact.email ?
                [updateSetting({key: 'getting-started-contact-email', value: formFields.contact.email })] :
                [];

        const updatingData = _.flatten([
            updatingDashboards,
            updatingMetrics,
            updatingMetricImportantFields,
            updatingSegments,
            updatingTables,
            updatingThingsToKnow,
            updatingContactName,
            updatingContactEmail
        ]);

        if (updatingData.length > 0) {
            await Promise.all(updatingData);

            clearRequestState({statePath: ['reference', 'guide']});

            await fetchGuide();
        }
    }
    catch(error) {
        setError(error);
        console.error(error);
    }

    resetForm();
    endLoading();
    endEditing();
};

const initialState = {
    error: null,
    isLoading: false,
    isEditing: false,
    isFormulaExpanded: false,
    isDashboardModalOpen: false
};
export default handleActions({
    [FETCH_GUIDE]: {
        next: (state, { payload }) => assoc(state, 'guide', payload)
    },
    [SET_ERROR]: {
        throw: (state, { payload }) => assoc(state, 'error', payload)
    },
    [CLEAR_ERROR]: {
        next: (state) => assoc(state, 'error', null)
    },
    [START_LOADING]: {
        next: (state) => assoc(state, 'isLoading', true)
    },
    [END_LOADING]: {
        next: (state) => assoc(state, 'isLoading', false)
    },
    [START_EDITING]: {
        next: (state) => assoc(state, 'isEditing', true)
    },
    [END_EDITING]: {
        next: (state) => assoc(state, 'isEditing', false)
    },
    [EXPAND_FORMULA]: {
        next: (state) => assoc(state, 'isFormulaExpanded', true)
    },
    [COLLAPSE_FORMULA]: {
        next: (state) => assoc(state, 'isFormulaExpanded', false)
    },
    [SHOW_DASHBOARD_MODAL]: {
        next: (state) => assoc(state, 'isDashboardModalOpen', true)
    },
    [HIDE_DASHBOARD_MODAL]: {
        next: (state) => assoc(state, 'isDashboardModalOpen', false)
    }
}, initialState);
