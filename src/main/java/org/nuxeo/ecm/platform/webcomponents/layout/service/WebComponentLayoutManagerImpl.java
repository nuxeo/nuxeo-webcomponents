/*
 * (C) Copyright 2015 Nuxeo SA (http://nuxeo.com/) and contributors.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *     Anahide Tchertchian
 */
package org.nuxeo.ecm.platform.webcomponents.layout.service;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.nuxeo.ecm.platform.forms.layout.api.BuiltinModes;
import org.nuxeo.ecm.platform.forms.layout.api.BuiltinWidgetModes;
import org.nuxeo.ecm.platform.forms.layout.api.Layout;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutRow;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutRowDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutTypeConfiguration;
import org.nuxeo.ecm.platform.forms.layout.api.LayoutTypeDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.Widget;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetReference;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetTypeConfiguration;
import org.nuxeo.ecm.platform.forms.layout.api.WidgetTypeDefinition;
import org.nuxeo.ecm.platform.forms.layout.api.impl.LayoutImpl;
import org.nuxeo.ecm.platform.forms.layout.api.impl.LayoutRowComparator;
import org.nuxeo.ecm.platform.forms.layout.api.impl.LayoutRowImpl;
import org.nuxeo.ecm.platform.forms.layout.api.impl.WidgetImpl;
import org.nuxeo.ecm.platform.forms.layout.api.impl.WidgetReferenceImpl;
import org.nuxeo.ecm.platform.forms.layout.core.service.AbstractLayoutManager;
import org.nuxeo.ecm.platform.forms.layout.functions.LayoutFunctions;
import org.nuxeo.runtime.api.Framework;

/**
 * @since 7.3
 */
public class WebComponentLayoutManagerImpl extends AbstractLayoutManager implements WebComponentLayoutManager {

    private static final long serialVersionUID = 1L;

    private static final Log log = LogFactory.getLog(WebComponentLayoutManagerImpl.class);

    @Override
    public String getDefaultStoreCategory() {
        return CATEGORY;
    }

    @Override
    public Layout getLayout(String layoutName, String mode) {
        return getLayout(layoutName, getDefaultStoreCategory(), mode, null, false);
    }

    @Override
    public Layout getLayout(String layoutName, String layoutCategory, String mode, List<String> selectedRows,
            boolean selectAllRowsByDefault) {
        LayoutDefinition layoutDef = getLayoutStore().getLayoutDefinition(layoutCategory, layoutName);
        if (layoutDef == null) {
            log.debug(String.format("Layout '%s' not found for category '%s'", layoutName, layoutCategory));
            return null;
        }
        return getLayout(layoutDef, mode, null, false);
    }

    @Override
    public Layout getLayout(LayoutDefinition layoutDef, String mode, List<String> selectedRows,
            boolean selectAllRowsByDefault) {
        if (layoutDef == null) {
            log.debug("Layout definition is null");
            return null;
        }
        String layoutName = layoutDef.getName();
        LayoutRowDefinition[] rowsDef = layoutDef.getRows();
        List<LayoutRow> rows = new ArrayList<LayoutRow>();
        Set<String> foundRowNames = new HashSet<String>();
        int rowIndex = -1;
        for (LayoutRowDefinition rowDef : rowsDef) {
            rowIndex++;
            String rowName = rowDef.getName();
            if (rowName == null) {
                rowName = rowDef.getDefaultName(rowIndex);
                if (selectedRows != null) {
                    log.debug(String.format("Generating default name '%s' in "
                            + "layout '%s' for row or column at index %s", rowName, layoutName,
                            Integer.valueOf(rowIndex)));
                }
            }
            boolean emptyRow = true;
            if (selectedRows != null && !selectedRows.contains(rowName) && !rowDef.isAlwaysSelected()) {
                continue;
            }
            if (selectedRows == null && !selectAllRowsByDefault && !rowDef.isSelectedByDefault()
                    && !rowDef.isAlwaysSelected()) {
                continue;
            }
            List<Widget> widgets = new ArrayList<Widget>();
            for (WidgetReference widgetRef : rowDef.getWidgetReferences()) {
                String widgetName = widgetRef.getName();
                if (widgetName == null || widgetName.length() == 0) {
                    // no widget at this place
                    widgets.add(null);
                    continue;
                }
                WidgetDefinition wDef = lookupWidget(layoutDef, widgetRef);
                if (wDef == null) {
                    log.error(String.format("Widget '%s' not found in layout %s", widgetName, layoutName));
                    widgets.add(null);
                    continue;
                }
                Widget widget = getWidget(layoutName, layoutDef, wDef, mode, 0);
                if (widget != null) {
                    emptyRow = false;
                }
                widgets.add(widget);
            }
            if (!emptyRow) {
                rows.add(new LayoutRowImpl(rowName, rowDef.isSelectedByDefault(), rowDef.isAlwaysSelected(), widgets,
                        rowDef.getProperties(mode), LayoutFunctions.computeLayoutRowDefinitionId(rowDef)));
            }
            foundRowNames.add(rowName);
        }
        if (selectedRows != null) {
            Collections.sort(rows, new LayoutRowComparator(selectedRows));
            for (String selectedRow : selectedRows) {
                if (!foundRowNames.contains(selectedRow)) {
                    log.debug(String.format("Selected row or column named '%s' " + "was not found in layout '%s'",
                            selectedRow, layoutName));
                }
            }
        }

        String layoutTypeCategory = layoutDef.getTypeCategory();
        String actualLayoutTypeCategory = getStoreCategory(layoutTypeCategory);
        LayoutTypeDefinition layoutTypeDef = null;
        String layoutType = layoutDef.getType();
        if (!StringUtils.isBlank(layoutType)) {
            // retrieve type for templates and props mapping
            layoutTypeDef = getLayoutStore().getLayoutTypeDefinition(actualLayoutTypeCategory, layoutType);
            if (layoutTypeDef == null) {
                log.debug(String.format("Layout type '%s' not found for category '%s'", layoutType, layoutTypeCategory));
            }
        }

        String template = layoutDef.getTemplate(mode);
        Map<String, Serializable> props = new HashMap<>();
        if (layoutTypeDef != null) {
            if (StringUtils.isEmpty(template)) {
                template = layoutTypeDef.getTemplate(mode);
            }
            LayoutTypeConfiguration conf = layoutTypeDef.getConfiguration();
            if (conf != null) {
                Map<String, Serializable> typeProps = conf.getDefaultPropertyValues(mode);
                if (typeProps != null) {
                    props.putAll(typeProps);
                }
            }
        }
        Map<String, Serializable> lprops = layoutDef.getProperties(mode);
        if (lprops != null) {
            props.putAll(lprops);
        }
        LayoutImpl layout = new LayoutImpl(layoutDef.getName(), mode, template, rows, layoutDef.getColumns(), props,
                LayoutFunctions.computeLayoutDefinitionId(layoutDef));
        layout.setType(layoutType);
        // XXX no value name handling
        layout.setValueName(null);
        layout.setTypeCategory(actualLayoutTypeCategory);
        if (Framework.isDevModeSet()) {
            layout.setDefinition(layoutDef);
            // resolve template in "dev" mode, avoiding default lookup on "any"
            // mode
            Map<String, String> templates = layoutDef.getTemplates();
            String devTemplate = templates != null ? templates.get(BuiltinModes.DEV) : null;
            if (layoutTypeDef != null && StringUtils.isEmpty(devTemplate)) {
                Map<String, String> typeTemplates = layoutTypeDef.getTemplates();
                devTemplate = typeTemplates != null ? typeTemplates.get(BuiltinModes.DEV) : null;
            }
            layout.setDevTemplate(devTemplate);
        }
        return layout;
    }

    @Override
    public Widget getWidget(String widgetName, String widgetCategory, String layoutMode, String layoutName) {
        WidgetReference widgetRef = new WidgetReferenceImpl(widgetCategory, widgetName);
        WidgetDefinition wDef = lookupWidget(widgetRef);
        if (wDef != null) {
            return getWidget(layoutName, null, wDef, layoutMode, 0);
        }
        return null;
    }

    @Override
    public Widget getWidget(WidgetDefinition wDef, String layoutMode, String layoutName) {
        if (wDef != null) {
            return getWidget(layoutName, null, wDef, layoutMode, 0);
        }
        return null;
    }

    /**
     * Computes a widget from a definition for a mode in a given context.
     * <p>
     * If the widget is configured not to be rendered in the given mode, returns null.
     * <p>
     * Sub widgets are also computed recursively.
     */
    @SuppressWarnings("deprecation")
    protected Widget getWidget(String layoutName, LayoutDefinition layoutDef, WidgetDefinition wDef, String layoutMode,
            int level) {
        String wMode = getModeFromLayoutMode(wDef, layoutMode);
        if (BuiltinWidgetModes.HIDDEN.equals(wMode)) {
            return null;
        }
        List<Widget> subWidgets = new ArrayList<Widget>();
        WidgetDefinition[] swDefs = wDef.getSubWidgetDefinitions();
        if (swDefs != null) {
            for (WidgetDefinition swDef : swDefs) {
                Widget subWidget = getWidget(layoutName, layoutDef, swDef, wMode, level + 1);
                if (subWidget != null) {
                    subWidgets.add(subWidget);
                }
            }
        }

        WidgetReference[] swRefs = wDef.getSubWidgetReferences();
        if (swRefs != null) {
            for (WidgetReference swRef : swRefs) {
                WidgetDefinition swDef = lookupWidget(layoutDef, swRef);
                if (swDef == null) {
                    log.error(String.format("Widget '%s' not found in layout %s", swRef.getName(), layoutName));
                } else {
                    Widget subWidget = getWidget(layoutName, layoutDef, swDef, wMode, level + 1);

                    if (subWidget != null) {
                        subWidgets.add(subWidget);
                    }
                }
            }
        }

        // XXX no variable resolution for now
        boolean required = Boolean.valueOf(wDef.getRequired(layoutMode, wMode));

        String wType = wDef.getType();
        String wTypeCat = wDef.getTypeCategory();
        // fill default property and control values from the widget definition
        Map<String, Serializable> props = new HashMap<String, Serializable>();
        Map<String, Serializable> controls = new HashMap<String, Serializable>();
        String actualWTypeCat = getStoreCategory(wTypeCat);
        WidgetTypeDefinition def = getLayoutStore().getWidgetTypeDefinition(actualWTypeCat, wType);

        WidgetTypeConfiguration conf = def != null ? def.getConfiguration() : null;
        if (conf != null) {
            Map<String, Serializable> defaultProps = conf.getDefaultPropertyValues(wMode);
            if (defaultProps != null && !defaultProps.isEmpty()) {
                props.putAll(defaultProps);
            }
            Map<String, Serializable> defaultControls = conf.getDefaultControlValues(wMode);
            if (defaultControls != null && !defaultControls.isEmpty()) {
                controls.putAll(defaultControls);
            }
        }

        props.putAll(wDef.getProperties(layoutMode, wMode));
        controls.putAll(wDef.getControls(layoutMode, wMode));

        WidgetImpl widget = new WidgetImpl(layoutName, wDef.getName(), wMode, wType, null, wDef.getFieldDefinitions(),
                wDef.getLabel(layoutMode), wDef.getHelpLabel(layoutMode), wDef.isTranslated(), wDef.isHandlingLabels(),
                props, required, subWidgets.toArray(new Widget[0]), level, wDef.getSelectOptions(),
                LayoutFunctions.computeWidgetDefinitionId(wDef), wDef.getRenderingInfos(layoutMode));
        widget.setControls(controls);
        widget.setTypeCategory(actualWTypeCat);
        if (Framework.isDevModeSet()) {
            widget.setDefinition(wDef);
        }
        return widget;
    }

    protected static String getModeFromLayoutMode(WidgetDefinition wDef, String layoutMode) {
        // XXX no variable resolution for now
        String wMode = wDef.getMode(layoutMode);
        if (wMode == null) {
            wMode = BuiltinModes.getWidgetModeFromLayoutMode(layoutMode);
        }
        return wMode;
    }

}