import { useTranslation } from "react-i18next";
import TagListPage from "./TagListPage";
import { TAG_PAGE_CONFIGS, type TagKey } from "../utils/tagPages";

type TagListRoutePageProps = {
  coverSize: number;
  tagKey: TagKey;
};

export default function TagListRoutePage({ coverSize, tagKey }: TagListRoutePageProps) {
  const { t } = useTranslation();
  const config = TAG_PAGE_CONFIGS[tagKey];
  const listConfig = config.list;
  const editConfig =
    config.supportsEdit === false || !listConfig.removeResourceType
      ? undefined
      : {
          title: config.getEditTitle(t),
          coverDescription: config.getCoverDescription(t),
          routeBase: listConfig.editRouteBase,
          responseKey: listConfig.responseKey,
          localCoverPrefix: listConfig.localCoverPrefix,
          removeResourceType: listConfig.removeResourceType,
          getRouteSegment:
            tagKey === "series" || tagKey === "franchise"
              ? (item: { id: string | number; title: string }) => String(item.id)
              : undefined,
          listResponseKey:
            tagKey === "series" || tagKey === "franchise"
              ? listConfig.listResponseKey
              : undefined,
          updateEventName: listConfig.updateEventName,
          updateEventPayloadKey: listConfig.updateEventPayloadKey,
        };

  const listKeyById = tagKey === "series" || tagKey === "franchise";
  /* Link con id per URL coerenti (es. /platforms/75757 invece di /platforms/Amiga) */
  const getRoute = (item: { id: string; title: string }) =>
    `${listConfig.routeBase}/${item.id}`;
  const showAlphabetNavigator =
    tagKey === "series" || tagKey === "franchise" || tagKey === "gameEngines" || tagKey === "platforms";

  return (
    <TagListPage
      coverSize={coverSize}
      routeBase={listConfig.routeBase}
      valueExtractor={listConfig.valueExtractor}
      getDisplayName={config.getDisplayName(t)}
      emptyMessage={config.getEmptyMessage(t)}
      listEndpoint={listConfig.listEndpoint}
      listResponseKey={listConfig.listResponseKey}
      listKeyById={listKeyById}
      getRoute={getRoute}
      showAlphabetNavigator={showAlphabetNavigator}
      editConfig={editConfig}
    />
  );
}
