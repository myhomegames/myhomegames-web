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

  return (
    <TagListPage
      coverSize={coverSize}
      routeBase={listConfig.routeBase}
      valueExtractor={listConfig.valueExtractor}
      getDisplayName={config.getDisplayName(t)}
      emptyMessage={config.getEmptyMessage(t)}
      listEndpoint={listConfig.listEndpoint}
      listResponseKey={listConfig.listResponseKey}
      editConfig={{
        title: config.getEditTitle(t),
        coverDescription: config.getCoverDescription(t),
        routeBase: listConfig.editRouteBase,
        responseKey: listConfig.responseKey,
        localCoverPrefix: listConfig.localCoverPrefix,
        removeResourceType: listConfig.removeResourceType,
        updateEventName: listConfig.updateEventName,
        updateEventPayloadKey: listConfig.updateEventPayloadKey,
      }}
    />
  );
}
