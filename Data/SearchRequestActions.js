import { Post, Get } from '../Fetch/ZeussFetch';
import { Types, ContentTypesList } from '../../constants/ContentFilterTypes';
import * as FilterListActions from '../FilterList/FilterListActions';
import { OrderBy } from '../../constants/FilterListConstants';
import { LoadData } from '../SearchResult/SearchResultActions';
import { ZeussDBName, GetEngagementByIds, ZeussTables } from '../Database/DataBaseActions';
import Dexie from 'dexie';
import * as PaginationFilterActions from '../PaginationFilter/PaginationFilterActions';
import { Types as ContentFilterTypes, ContactTypes }  from '../../constants/ContentFilterTypes';
import * as ContentFilterActions from '../ContentFilter/ContentFilterActions';
import * as ContentFilterRangeActions from '../ContentFilterRange/ContentFilterRangeActions';
import { SyncDataSources } from '../Database/DataBaseActions';
import * as LoadingActions from '../Loading/LoadingActions';
import { Types as SearchResultTypes} from '../../constants/SearchResultConstants';
import { EngagementStatusTypes, EngagementTypes } from '../../constants/EngagementTrackerConstants';
import * as SearchResultActions from '../SearchResult/SearchResultActions';
import { push } from 'connected-react-router';


/**
 * Prepare the fields acccording the schema defined on Zeuss wiki: https://github.com/ZeussInc/olympus/wiki/Search-Request-And-Response-Schema
 *
 * @param {any} filterList
 * @returns
 */
function getFilters(filterList) {
    return filterList.filter(filter => filter.filterType != Types.keyword).map( filter => {
        return {
            filterType  : filter.filterType,
            operator    : filter.operator,
            values      : [].concat.apply([], filter.values.map(value => {
                    // return the key according the Type
                    switch (filter.filterType) {
                        case Types.contacts: return [].concat(value.idsList);
                        case Types.visitors: return value.email.map(v => v.replace('visitor_', ''));
                        case Types.organizations: return value.id;
                        case Types.datasources: return value.description;
                        case Types.contentType : return value.id;
                        case Types.locations: return value.description;
                        case Types.userReports: return value.id;
                        case Types.engagementCreatedBy: return value.id;
                        case Types.citizenship: return value.description;
                        case Types.engagementStatus: return value.id;
                        case Types.engagementTypes: return value.id;
                        case Types.requiresApprovalBy: return value.id;
                        case Types.engagementActionOfficer: return value.id;
                        case Types.hasAttachments: return value.value;
                        case Types.engagementInOutType: return value.id;
                        case Types.peopleKeyword: return value;
                        default:
                            return value;
                    }
                })
            )
        }
    })
}

/**
 * transform the state into a object to request data
 *
 * @export
 * @param {any} state
 * @returns
 */
export function prepareSearchRequest(state){
    let searchRequest = {
        'searchFor' : JSON.stringify({
            // we set or the query based on the list, or the query based on the state.query
            query : (state.query === undefined || state.query.length == 0) ? (state.filterList === undefined ? "" : state.filterList.filter( filter => filter.filterType == Types.keyword ).map( filter => filter.values.map(field => field.description).join(' ')).toString()) : state.query,
            // set the order by default or by the state
            orderBy : state.orderBy === undefined ? OrderBy.MOST_RELEVANT.toLowerCase() : state.orderBy.toLowerCase(),
            // set the page by default or by state
            page: state.page === undefined ? 0 : state.page,
            // set the filter by default or by state
            filters: state.filterList === undefined ? [] : getFilters(state.filterList),
        })
    };


    return searchRequest;
}

/**
 * Collect all dinstinct ids returned from the search
 *
 * @param {any} data
 * @returns
 */
export function getAllContactIdsFromResult(data, onlyFromMessages){
    try {
        
        let arrayLength = 0;
        // store all contact elements
        let contactIds = [];
        if (Array.isArray(data.contactIdsFacet) && !onlyFromMessages) {
            arrayLength = data.contactIdsFacet.length;
            while(arrayLength--) {
                let contact = data.contactIdsFacet[arrayLength];
                contactIds.push({
                    ...contact,
                    id: ContactTypes.contact + '_' + contact.id,
                    id_number: contact.id
                })
            }
        }
        
        let visitorIds = [];
        if (Array.isArray(data.visitorIdsFacet) && !onlyFromMessages) {
            arrayLength = data.visitorIdsFacet.length;
            while(arrayLength--) {
                const visitor = data.visitorIdsFacet[arrayLength];
                visitorIds.push({
                    ...visitor,
                    id: ContactTypes.visitor + '_' + visitor.id,
                    id_number: visitor.id
                })
            }
        }

        // if onlyFromMessages == true then we'll return only ids that are inside messages, ignoring contactsIds/visitorsIds because it's irrelevant to us
        let idsFromMessages = [];
        
        // WORKAROUND: As contactIds is missing data.. we need to search for more ids in other fields 😕
        let messageIds =[];
        arrayLength = data.messages.length;
        while (arrayLength--) {
            let message = data.messages[arrayLength];
            if (message.from != undefined)
                messageIds.push({
                    id: ContactTypes.contact + '_' + message.from,
                    id_number: message.from
                });
        }

        contactIds = contactIds.concat(messageIds);

        // WORKAOUND: if data is related to a detail of a message (by the fact that we don't receive the data.contacts and data.visitor)
        let allMessageContacts = [];
        if (data.contactIdsFacet == undefined && data.visitorIdsFacet == undefined) {
            allMessageContacts = [].concat.apply([], data.messages.filter(message => message.participants != undefined).map(m => m.participants.map((p) => { return { id: ContactTypes.contact + '_' + p }})))
        }

        allMessageContacts = allMessageContacts.concat(data.messages.filter(message => message.messageTypeId == SearchResultTypes.PEOPLE && // all elements that are visitor cards...
                                                                                       visitorIds.find( visitor => visitor.id == message.id)== undefined) // and that still aren't inserted in the list
                                                                                       .map((visitor) =>{
                                                                                           return { id: visitor.id }
                                                                                        }));
        // if it's defined that it MUST return only ids that are inside messages
        if (onlyFromMessages) {
            let visitorIdsFromMessages = data.messages.filter(message => message.messageTypeId == SearchResultTypes.PEOPLE)
                                                    .map((visitor) => {
                                                        return { 
                                                            id: visitor.id,
                                                        }
                                                    });
            return [].concat(messageIds, visitorIdsFromMessages, allMessageContacts);
        }

        return [].concat(contactIds, visitorIds, allMessageContacts, allMessageContacts).filter(contact => contact != undefined);
    }
    catch(error) {
        console.log(error);
        throw error;
    }
}

/**
 * Hydrates the message to render the needed info
 * @param {*} message
 */
function FormatGlobalDirectoryMessage(message, arrayOfContacts) {
    return {
        ...message,
        dataType: message.messageTypeId,
        from: arrayOfContacts.find((visitor) => visitor.type + visitor.id == message.id)
    }
}


/**
 * Get the crude data received from the endpoint, do the looking to get all the details of the contacts based on its ids,
 * prepare de return according the format that will be accepted to be rendered over the UI
 *
 * @param {any} data
 * @param {any} dispatch
 */
export function FormatResultData (data, dispatch, methodToDispatch, messageId = undefined, contactAndVisitorsData = undefined) {
    // collect all contacts ids, since contact list, till visitors list
    let contactIds = getAllContactIdsFromResult(data, false);
    // we verify from wich data source are we going to use to fill the contact/visitors element.
    // contactAndVisitorsData contains a memoized list from the current state, the data.[contactIdsFacet or visitorIdsFacet] are the one returned 
    // from the json call.
    // if the data.* is undefined, it means that the user is paginating and for each new pagination, it doesn't return the visitor/contacts related
    // to the search because it's returned in the first instance.
    let contactData = data.contactIdsFacet || data.visitorIdsFacet ? [].concat(data.contactIdsFacet, data.visitorIdsFacet) : contactAndVisitorsData;

    // from the contact data, filter just those elements related to messages
    let contactsAndVisitors = contactData.filter(c => contactIds.find(e => e.id == c.type + c.id));
    let mappedItems = {
        docsFound: data.docsFound,
        items : data.messages.map(function(message) {
            // if the message is an engagement...
            if (message.messageTypeId == SearchResultTypes.ENGAGEMENT){
                // return the pure message
                return {
                    ...message,
                    dataType: message.messageTypeId,
                    engagementStatusTypeId: EngagementStatusTypes.find(status => status.id == message.engagementStatusTypeId)
                };
            }

            // for PEOPLE messages...
            if (message.messageTypeId == SearchResultTypes.PEOPLE)
                // return a formatted message
                return FormatGlobalDirectoryMessage(message, contactsAndVisitors);

            // get the contact of the current message
            let contact = contactsAndVisitors.find(c =>  c.id ==  message.from)

            // for other cases / scenarios
            return {
                ...message,
                // it's a workaround to set the id of the message in messages that are attachments
                id: message.id,
                messageId : message.messageId,
                dataType: message.messageTypeId || message.messageType,
                dataFrom: contact ? contact.name : "Unknown " + message.from,
                from: contact,
                dataFromId: message.from,
                dataImg: contact ? contact.photo : "",
                dataDate: TimestampToFormatedDate(message.date),
                dataContent : {
                    title : message.content.subject,
                    // it's a workaround because the MessageType 2 should return a file, but it self is considered a file
                    // so, when the message type is an ATTACHMENT, it will receive the value from message.content, that contains all
                    // details about the file
                    content:  (message.messageTypeId || message.messageType) === SearchResultTypes.ATTACHMENT ? message.content : message.content.content,
                    // WORKAROUND: in some cases, it's returning null when it should return an empty array
                    fileList: message.content.fileList == null ? [] : message.content.fileList,
                    files: message.content.files,
                    participants: message.participants.map(function (participant) {
                        let participantOfList = contactsAndVisitors.filter( f => f.id == participant);
                        return ({
                            name: (participantOfList.length > 0) ? participantOfList[0].name : '',
                            id: participant,
                            photo: (participantOfList.length > 0) ? participantOfList[0].photo : '',
                            email: (participantOfList.length > 0) ? participantOfList[0].email : ''
                        })
                    })
                }
            };
        })
    };
    dispatch(LoadingActions.HideLoading());
    // as we can dispatch the result to many different stores, we just say to where we want to dispatch the result
    dispatch(methodToDispatch(mappedItems, messageId));

}

/**
 * Load all countries in the CitizenshipContentFilter
 * @param {*} dispatch
 */
export function FormatCitizenship(dispatch) {
    Get('/static/tables/country', {}).then((response) => {
        let countries = {
            groupFilter: ContentFilterTypes.citizenship,
            listObjects: response.map((country) => {
                return {
                    id: country.id,
                    description: country.countryName,
                }
            })
        };

        dispatch(ContentFilterActions.LoadFilters(countries));
    })
}

/**
 * As we don't need to do the lookup in the IndexedDB, we just hydrate the data and sent it to the reducer to update
 * the state and show it into the UI
 *
 * @param {any} data
 * @param {any} dispatch
 */
function FormatLocations(data, dispatch) {
    // only dispatche if we have data fetched...
    if (data.locationStrsFacet != undefined) {
        let locations = {
            groupFilter: ContentFilterTypes.locations,
            listObjects: data.locationStrsFacet.map(function(location) {
                return {
                    id: location.id,
                    description: location.id,
                    freq: location.freq,
                }
            })
        }

        dispatch(ContentFilterActions.LoadFilters(locations))

    }
}

/**
 * Load the ContentType sources having as base the data_message_type that contains the list of possible elements
 *
 * @param {any} dispatch
 */
function FormatContentType(data, dispatch) {

    if (data.messageTypeIdsFacet !== undefined)
        try{
        
            // get all elements from the data received and add the description according its id, having the list of ContentTypeList as reference
            let formatedList = ContentTypesList.sort((a, b) => {
                if (a.description < b.description)
                    return -1;
                if (a.description > b.description)
                    return 1;
                return 0;
            }
            ).map((f) => {
                // get the current filter data received from the fetchedData
                let currentFilter = data.messageTypeIdsFacet.find((mt) => mt.id == f.id);
                return {
                    // set the current value from the list of default filters
                    ...f,
                    // and set the freq fetched from the currentFilter found
                    freq: currentFilter == undefined ? 0 : currentFilter.freq
                }
            });

            let list = {
                groupFilter: Types.contentType,
                listObjects: formatedList
            };

            dispatch(ContentFilterActions.LoadFilters(list));
        }
        catch(error){
            throw error;
        }
}



/**
 * Get all data sources from IndexedDB and set it to the state
 * @param {*} dispatch
 */
export function FormatUserReports(dispatch) {

    Get('/services/data-tables?name=Sync\\UserReportsDataTable&length=200&start=0&lastUpdated=1').then(userReport => {
        let userReports = {
            groupFilter: ContentFilterTypes.userReports,
            listObjects: userReport.data.map((report) => {
                return {
                    id: report.id,
                    description: report.email,
                    imgSrc: ContentFilterActions.GetUSerReportImageById(report.sourceTypeId),
                    updatedOn: report.updatedOn,
                    
                }

            })
        };                
        dispatch(ContentFilterActions.LoadFilters(userReports))
    })
}


/**
 * An Array.Find implementation specific that has improved in more than 100% comparated to the 
 * method .find()
 * @param {*} contact 
 * @param {*} array 
 * @param {*} arrayLength 
 */
function findContactByParameter(contact, array, arrayLength, parameter) {
    let a = 0,
        z = arrayLength;
    while (z >= a) {
        // we search from [z..a]
        let contactZ = array[z];
        if (contactZ[parameter] == contact[parameter])
            return contactZ;

        // we search from [z..a]
        let contactA = array[a];
        if (contactA[parameter] == contact[parameter])
            return contactA;
        z--;
        a++;
    }
}

/**
 * Hydrate the Contact according the model structure that we have
 * @param {*} contact 
 */
function getFormattedContact(contact) {
    return !contact ? contact : {
        ...contact,
        id: ContactTypes.contact + '_' + contact.id,
        type: ContactTypes.contact,
        imgSrc : contact.photo || '',
        description: contact.name,
        email: [contact.email],
        idsList: [ContactTypes.contact + '_' + contact.id]
    }
}
/**
 * Hydrate the Visitor according the model structure that we have
 * @param {*} visitor 
 */
function getFormattedVisitor(visitor) {
    return !visitor ? visitor : {
        ...visitor,
        id: `${ContactTypes.visitor}_${visitor.id}`,
        type: ContactTypes.visitor,
        email: [`${ContactTypes.visitor}_${visitor.id}`],
        description: visitor.name
    }

}

/**
 * Get the pure data from contacts and visitors, hydradate it with informations saved in the IndexedDB and dispatches
 * it to the components
 * @param {*} data
 * @param {*} dispatch
 */
export function FormatContacts(data, dispatch, aggregateNewData = false) {
    if (data.contactIdsFacet == undefined && data.visitorIdsFacet == undefined)
        return;

    // we map the contacts and visitors according the sync data structure
    let contacts = MergeContactsList(data.contactIdsFacet, getFormattedContact);
    let visitors = MergeContactsList(data.visitorIdsFacet, getFormattedVisitor);


    // sort the merged list of visitors and contacts by its freq
    let tempMergedList = [].concat(contacts, visitors).sort((a, b) => {
        if (a.freq > b.freq)
            return -1;
        else
        if (a.freq < b.freq)
            return 1;
        else
            return 0;
    });
    
    let listOfContacts = {
        groupFilter: ContentFilterTypes.contacts,
        // hydrates the list
        // sort the list  in desc
        listObjects: tempMergedList
    }
    dispatch(ContentFilterActions.LoadFilters(listOfContacts,aggregateNewData));
    dispatch(SearchResultActions.LoadContactAndVisitorData([].concat(data.contactIdsFacet, data.visitorIdsFacet)));
}

/**
 * Get the current list of contacts and returns a new that doesn't contain duplicated contacts based on its email
 * @param {Array} listReference the list that contains all elements that are going to be merged having the email as reference, or, unique element that cannot be duplicated
 */
function MergeContactsList(data, methodToFormat){
    let contacts = [];
    if (Array.isArray(data)){
        // first, we collect all possible repeated names 
        let a = 0;
        let z = data.length-1;
        let counter = -1;
        // from [a..z]
        while (z >= a) {
            let currentContactZ = methodToFormat(data[z]);
            let contactZ = findContactByParameter(currentContactZ, contacts, counter, 'name');
            // if the current contact wasn't found
            if (contactZ == undefined) {
                counter++;
                contacts[counter] = {
                    ...currentContactZ,
                    // we define which position is the contact in the contact list
                    position: counter,
                    idsList: [currentContactZ.id]
                }
            } else {
                // if the contact was found.. we just add more details (like emails, ids)
                // however, we apply these new values in the element that exist in the array
                contacts[contactZ.position] = {
                    ...contactZ,
                    freq  : contactZ.freq + currentContactZ.freq,
                    email : contactZ.email.concat(currentContactZ.email),
                    idsList: contactZ.idsList.concat(currentContactZ.idsList)
                }
            }

            // if the increasing index is equal to decreasing index, that means that we don't need to 
            // add the below contact in the list, because it was already added in the context above.
            if (a==z)
                break;
            // we take the same process, however, with the inverted index
            let currentContactA = methodToFormat(data[a]);
            let contactA = findContactByParameter(currentContactA, contacts, counter, 'name');
            if (contactA == undefined) {
                counter++;
                contacts[counter] = {
                    ...currentContactA,
                    position: counter,
                    idsList: [currentContactA.id]
                }
            } else {                
                // if the contact was found.. we just add more details (like emails, ids)
                // however, we apply these new values in the element that exist in the array
                contacts[contactA.position] = {
                    ...contactA,
                    freq  : contactA.freq + currentContactA.freq,
                    email : contactA.email.concat(currentContactA.email),
                    idsList: contactA.idsList.concat(currentContactA.idsList)
                }
            }
            z--;
            a++;
        }
    }
    return contacts;
}


/**
 * Get the fetched data, hydrates and then dispatch it to the component responsible to render the list
 * @param {*} data Fetched data that is going to be hydrated
 * @param {*} dispatch Function that will call the method to dispatch the result to another method
 */
function FormatOrganizations(data, dispatch) {
    let db = new Dexie(ZeussDBName)
    db.open().then(function(){
        let currentData = data.organizationIdsFacet;
            // only search for data, if we have it on the callback data.
        if (currentData != undefined) {
            // start the search
            db.table('Organization')
                .where('id')
                .anyOf(currentData.map(org => org.id))
                .toArray()
                .then(function(listOfElements) {
                    // we return a list containg the data ot the currentTable
                    let list = {
                        groupFilter: ContentFilterTypes.organizations,
                        listObjects: listOfElements.map(function(org) {
                            return {
                                id: org.id,
                                description:  org.name,
                                imgSrc: org.photo,
                                freq: currentData.filter(v => v.id == org.id)[0].freq,
                                // we set all data into dataObject rather than map all fields
                                ...org
                            }
                        }).sort(function(a, b){
                            if (a.freq > b.freq)
                                return -1;
                            if (a.freq < b.freq)
                                return 1;
                            return 0;
                        })
                    };
                        
                    // once we have all the list of contact.. we dispatch it to be added
                    dispatch(ContentFilterActions.LoadFilters(list))
                }).catch(function(error) {
                    console.log(error);
                    throw error;
                })
        }
    }).catch(function(error){
        console.log(error);
        throw error;
    })
}


/**
 * Get the list of engagement types related to the search, hydrates it and set into the Filter List
 * @param {*} data
 * @param {*} dispatch
 */
function FormatEngagementType(data, dispatch) {

    if (data.engagementTypeIdsFacet == undefined)
        return;

    let db = new Dexie(ZeussDBName);
    let engagementTypes = data.engagementTypeIdsFacet == undefined ? [] : data.engagementTypeIdsFacet;
    db.open().then(() => {
        db.table(ZeussTables.EngagementTypes)
        .where('id')
        .anyOf(engagementTypes.map(engagement => engagement.id))
        .toArray()
        .then((arrayOfEngagements) => {
            let list = {
                groupFilter: ContentFilterTypes.engagementTypes,
                listObjects: arrayOfEngagements.map(function(engagement) {
                    return {
                        ...engagement,
                        id: engagement.id,
                        description: engagement.name,
                        imgSrc: "",
                        freq: engagementTypes.filter(v => v.id == engagement.id)[0].freq,
                        // we set all data into dataObject rather than map all fields
                    }
                }).sort(function(a, b){
                    if (a.freq > b.freq)
                        return -1;
                    if (a.freq < b.freq)
                        return 1;
                    return 0;
                })
            };
        
            // once the data is hydrated, we dispatch it
            dispatch(ContentFilterActions.LoadFilters(list))
        })
    }).catch(error => {
        console.log(error);
        throw error(error);
    })
}

/**
 * Get the list of engagement status related to the search, hydrates it and set into the Filter List
 * @param {*} data
 * @param {*} dispatch
 */
function FormatEngagementStatus(data, dispatch) {
    if (data.engagementStatusTypeIdsFacet == undefined)
        return;

    let db = new Dexie(ZeussDBName);
    let engagementStatuses = data.engagementStatusTypeIdsFacet == undefined ? [] : data.engagementStatusTypeIdsFacet;
    db.open().then(() => {
        db.table(ZeussTables.EngagementStatusTypes)
        .where('id')
        .anyOf(engagementStatuses.map(s => s.id.toString()))
        .toArray()
        .then((arrayOfStatus) => {
            let list = {
                groupFilter: ContentFilterTypes.engagementStatus,
                listObjects: arrayOfStatus.map(function(status) {
                    return {
                        ...status,
                        id: status.id,
                        description: status.name,
                        imgSrc: "",
                        freq: engagementStatuses.filter(v => v.id == status.id)[0].freq,
                        // we set all data into dataObject rather than map all fields
                    }
                }).sort(function(a, b){
                    if (a.freq > b.freq)
                        return -1;
                    if (a.freq < b.freq)
                        return 1;
                    return 0;
                })
            };
        
            // once the data is hydrated, we dispatch it
            dispatch(ContentFilterActions.LoadFilters(list))
        })
    }).catch(error => {
        console.log(error);
        throw error(error);
    })
}
/**
 * Get the ids from createdBy, hydrates it with the data from IndexedDB, hydrates and dispatch it to be shown in the list
 * @param {*} data
 * @param {*} dispatch
 */
function FormatEngagementCreators(data, dispatch) {
    if (data.createdByIdsFacet == undefined)
        return;

    let db = new Dexie(ZeussDBName);
    let engagementCreators = data.createdByIdsFacet == undefined ? [] : data.createdByIdsFacet;
    db.open().then(() => {
        db.table(ZeussTables.EngagementCreatedBy)
        .where('id')
        .anyOf(engagementCreators.map(s => s.id.toString()))
        .toArray()
        .then((arrayOfCreators) => {
            let list = {
                groupFilter: ContentFilterTypes.engagementCreatedBy,
                listObjects: arrayOfCreators.map(function(creator) {
                    return {
                        ...creator,
                        id: creator.id,
                        description: creator.displayName,
                        imgSrc: "",
                        freq: engagementCreators.filter(v => v.id == creator.id)[0].freq,
                        // we set all data into dataObject rather than map all fields
                    }
                }).sort(function(a, b){
                    if (a.freq > b.freq)
                        return -1;
                    if (a.freq < b.freq)
                        return 1;
                    return 0;
                })
            };
            // once the data is hydrated, we dispatch it
            dispatch(ContentFilterActions.LoadFilters(list))
        })
    }).catch(error => {
        console.log(error);
        throw error(error);
    })
}

/**
 * Format the list of groups that are responsible to approve an engagement
 * @param {*} dispatch
 */
function FormatRolesList(data, dispatch) {
    if (data.approvalGroupStrsFacet != undefined) {

        let arrayOfRoles = data.approvalGroupStrsFacet;
        let list = {
            groupFilter: ContentFilterTypes.requiresApprovalBy,
            listObjects: arrayOfRoles.map(function(role) {
                // find the current role in the search result and get its freq to be set in the role filter
                return {
                    id: role.id,
                    description: role.id,
                    freq: role.freq
                }
            }).sort(function(a, b){
                if (a.freq > b.freq)
                    return -1;
                if (a.freq < b.freq)
                    return 1;
                return 0;
            })
        };
        
        // once the data is hydrated, we dispatch it
        dispatch(ContentFilterActions.LoadFilters(list))
    }
}

/**
 * Add filters related to Person Responsible
 * @param {*} data 
 * @param {*} dispatch 
 */
function FormatActionOfficers(data, dispatch) {
    if (data.actionOfficerIdsFacet == undefined)
        return;

    let db = new Dexie(ZeussDBName);
    let actionOfficers = data.actionOfficerIdsFacet == undefined ? [] : data.actionOfficerIdsFacet;
    db.open().then(() => {
        db.table(ZeussTables.ActionOfficer)
        .where('id')
        .anyOf(actionOfficers.map(s => s.id.toString()))
        .toArray()
        .then((arrayOfActionOfficers) => {
            let list = {
                groupFilter: ContentFilterTypes.engagementActionOfficer,
                listObjects: arrayOfActionOfficers.map(function(actionOfficer) {
                    return {
                        ...actionOfficer,
                        id: actionOfficer.id,
                        description: actionOfficer.displayName,
                        imgSrc: "",
                        freq: actionOfficers.filter(v => v.id == actionOfficer.id)[0].freq,
                    }
                }).sort(function(a, b){
                    if (a.freq > b.freq)
                        return -1;
                    if (a.freq < b.freq)
                        return 1;
                    return 0;
                })
            };
        
            // once the data is hydrated, we dispatch it
            dispatch(ContentFilterActions.LoadFilters(list))
        })
    }).catch(error => {
        console.log(error);
        throw error(error);
    })
}

// /** DISABLED ON OL-651
//  * List all IN/OUT engagements and dispatches the options to be selected as filter
//  * @param {*} data 
//  * @param {*} dispatch 
//  */
// function FormatInOutEngagement(data, dispatch) {
    
//     if (data.engagementInOutTypeFacet !== undefined) {
//         let incoming = data.engagementInOutTypeFacet.find(type => type.id == 'incoming');
//         let outgoing = data.engagementInOutTypeFacet.find(type => type.id == 'outgoing');
//         let list = {
//             groupFilter: ContentFilterTypes.engagementInOutType,
//             listObjects: [
//                 {
//                     id: EngagementTypes.INCOMING,
//                     description: 'Incoming',
//                     freq: incoming ? incoming.freq : 0
//                 },
//                 { 
//                     id: EngagementTypes.OUTGOING,
//                     description: 'Outgoing',
//                     freq: outgoing ? outgoing.freq : 0
//                 }
//             ]
//         };
//         dispatch(ContentFilterActions.LoadFilters(list));
//     }
// }

/**
 * Get the pure data and format to the UI with the looked up database data.
 * We're passing the filters because we want to identify wich filter was selected by the user to reflect it
 * in the UI
 *
 * @param {any} data
 * @param {any} dispatch
 */
function FormatDataSources(data, dispatch) {
    try {
        FormatLocations(data, dispatch);
        FormatContentType(data, dispatch);
        FormatUserReports(dispatch);
        FormatContacts(data, dispatch);
        FormatOrganizations(data, dispatch);
        FormatEngagementType(data, dispatch);
        FormatEngagementStatus(data, dispatch);
        FormatEngagementCreators(data, dispatch);
        FormatRolesList(data, dispatch);
        FormatActionOfficers(data, dispatch);
        // disabled on OL-651
        //FormatInOutEngagement(data, dispatch);

    } catch (error) {
        console.log(error);
    }

}

/**
 * This method set filters and result restored from the history browser
 * @param {*} json 
 * @param {*} dispatch 
 * @param {*} state 
 */
export function setFiltersAndResult(json, dispatch, state) {
    // first we get the engagements data from indexedDB to set its value into each engagement from the fetched data
    GetEngagementByIds(json.messages.filter(message => message.messageTypeId == SearchResultTypes.ENGAGEMENT).map(engagement => engagement.engagementTypeId)).then((arrayOfEngagements) => {
        // then we manipulate the returned list to set the engagement rather set only the id
        json.messages = json.messages.map((message) => {
            // we manipulate only the message that is an engagement
            if (message.messageTypeId == SearchResultTypes.ENGAGEMENT)
                return {
                    ...message,
                    engagementType : arrayOfEngagements.find(engagementType => engagementType.id == message.engagementTypeId)
                }
            else
                return message;
        });

        // we format the result and set it on the state to be applyied into the UI
        FormatResultData(json, dispatch, LoadData, null, state.contactData);
        // we format the data sources that will be used as filters
        FormatDataSources(json, dispatch);
        // we set the total of pages
        dispatch(PaginationFilterActions.SetTotalPages(Math.ceil(json.docsFound / json.docsReturned)));
        dispatch(ContentFilterRangeActions.SetInitialValue(json.minDate, json.maxDate));

        //dispatch(FilterListActions.SetQueryId(query_id));
        // tells that the first load happened
        dispatch(SearchResultActions.LoadedData(true));
        
    }).catch(error => console.log(error));
}

/**
 * Dispatches the requisition to the server, hydrates the result to show it over UI
 *
 * @export
 * @param {any} filters
 * @param {any} dispatch
 */
export function doRequest(filters, dispatch, state) {
    dispatch(LoadingActions.ShowLoading());
    let preparedFilter = prepareSearchRequest(filters);
    Post('/services/search/message', preparedFilter).then(function(json) {
        //fixes the date time adding MS
        json.minDate = json.minDate * 1000;            
        json.maxDate = json.maxDate * 1000;
        SyncDataSources(json, dispatch).then(() => {
            // first we get the engagements data from indexedDB to set its value into each engagement from the fetched data
            GetEngagementByIds(json.messages.filter(message => message.messageTypeId == SearchResultTypes.ENGAGEMENT).map(engagement => engagement.engagementTypeId)).then((arrayOfEngagements) => {
                // then we manipulate the returned list to set the engagement rather set only the id
                json.messages = json.messages.map((message) => {
                    // we manipulate only the message that is an engagement
                    if (message.messageTypeId == SearchResultTypes.ENGAGEMENT)
                        return {
                            ...message,
                            engagementType : arrayOfEngagements.find(engagementType => engagementType.id == message.engagementTypeId)
                        }
                    else
                        return message;
                });

                // for each query performed, we'll add an id that will be used as referecen to when load the data (in components) from endpoint OR
                // from the browser history, which is save in the react-router => state
                let query_id = getNewGuid();
                json = {
                    ...json,
                    query_id: query_id,
                    query_date: new Date()
                }
                // dispatch(FilterListActions.SetQueryId(query_id));
                dispatch(push('/search/' + JSON.stringify(filters), JSON.stringify({ 
                    filters: filters, 
                    data: json, 
                    state: { 
                        contactData: state.SearchResultReducer.contactData, 
                        pagination: state.PaginationFilterReducer 
                    } 
                })));
                // we format the data sources that will be used as filters
                FormatDataSources(json, dispatch);
                // we format the result and set it on the state to be applyied into the UI
                FormatResultData(json, dispatch, LoadData, null, state.SearchResultReducer.contactData);
                // tells that the first load happened
                dispatch(SearchResultActions.LoadedData(true));
                // we set the total of pages
                dispatch(PaginationFilterActions.SetTotalPages(Math.ceil(json.docsFound / json.docsReturned)));
                dispatch(ContentFilterRangeActions.SetInitialValue(json.minDate, json.maxDate));

                
            }).catch(error => console.log(error));
        })
        
    }).catch(function(message){
        showMessageError('Something wrong happened.')
        dispatch(LoadingActions.HideLoading());
    });
}

/**
 * Methods that requist data from the server according the filters
 *
 * @export
 * @param {any} filters
 */
export function doSearchRequest (filters) {
    return function(dispatch) {

        // we dispatch the initial query
        dispatch(FilterListActions.SetInitialQuery(filters.query));
        doRequest(filters);
    }
}

/**
 * It's the first call from Initial Search that will fetch the initial data
 *
 * @export
 * @param {any} text
 * @returns
 */
export function doInitialSearchRequest(text) {
    return (doSearchRequest(prepareSearchRequest({ query: text})));
}

/**
 * 
 * @param {*} facet 
 * @param {current list of filters that are used to fetch data that will be used to request more facet data} filters 
 * @param {content that will be used as reference for the new search} searchContent 
 * @param {Defines what method is being called to set the data into the facets} methoToDispatch 
 * @param {dispatch reference} dispatch 
 */
export function RequestMoreFacetData(facet, filters, searchContent, methodToDispatch, dispatch) {
    // which filterType keyword will be used?
    let filterType = undefined;

    // for contacts and visitors, the filterType is the same
    if (facet == Types.contacts || facet == Types.visitors)
        filterType = Types.peopleKeyword;

    
    let newFilter = {
        ...filters,
        filterList: filters.filterList.filter(filter => filter.filterType != filterType)
    };

    // adds a new filter into the filter list to be applied 
    newFilter.filterList.push({
        filterType,
        "operator": "AND",
        values: [searchContent]
    });

    let preparedFilter = prepareSearchRequest(newFilter);
    Post('/services/search/message', preparedFilter).then(function(json) {
        SyncDataSources(json, dispatch).then(() => {
            // we call the method that format the data sources and delivers to the filters facet
            // this method is passed as parameter and then called over here
            methodToDispatch(json, dispatch, true);
            // first we get the engagements data from indexedDB to set its value into each engagement from the fetched data
        })
        
    }).catch(function(message){
        showMessageError('Something wrong happened.')
    });
}
